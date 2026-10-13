// Usage: node shot.mjs <url> <outPrefix> <width> <height> <dpr> <t1,t2,...> [bench]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [url, prefix, W, Hh, DPR, times, extra] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(
  "/usr/bin/chromium",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/chrome-prof-${Date.now()}`,
    `--window-size=${W},${Hh}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getWs() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((p) => p.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("no chrome");
}

const ws = new WebSocket(await getWs());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const logs = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.consoleAPICalled") {
    logs.push(`[${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description).join(" "));
    if (String(msg.params.args[0]?.value).includes("[hero]")) console.log(logs[logs.length - 1]);
  } else if (msg.method === "Runtime.exceptionThrown") {
    logs.push("[exception] " + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
  }
};
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evalJs = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: +W,
  height: +Hh,
  deviceScaleFactor: +DPR,
  mobile: +W <= 720,
});
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: process.env.COLOR_SCHEME ?? "light" }] });
await send("Page.navigate", { url });
let ready = false;
for (let i = 0; i < 80; i++) {
  await sleep(500);
  const v = await evalJs(`document.querySelector('[data-hero=root]')?.dataset.ready`);
  if (v) {
    ready = true;
    break;
  }
}
console.log("ready:", ready);
if (!ready) {
  console.log(logs.slice(0, 30).join("\n"));
  console.log(
    await evalJs(`(async()=>{const out={canvas:!!document.querySelector('canvas'),rs:document.readyState};
      const t0=performance.now();
      try{const im=new Image();im.src='/hero/avatar-3.svg';await im.decode();out.decode3=performance.now()-t0;}catch(e){out.err=String(e)}
      try{const c=document.createElement('canvas');c.width=c.height=8;const g=c.getContext('webgl2');out.webgl2=!!g;}catch(e){out.glerr=String(e)}
      return JSON.stringify(out)})()`),
  );
  const shot = await Promise.race([
    send("Page.captureScreenshot", { format: "png" }),
    sleep(15000).then(() => null),
  ]);
  if (shot) writeFileSync(`${prefix}-fail.png`, Buffer.from(shot.result.data, "base64"));
  chrome.kill("SIGKILL");
  process.exit(1);
}
await sleep(600);

if (extra === "bench") {
  console.log("info:", JSON.stringify(await evalJs(`JSON.stringify(window.__hero.info())`)));
  for (const t of [0, 10.5, 12, 15, 18, 22, 25, 27]) {
    await evalJs(`window.__hero.seek(${t})`);
    console.log("bench t=" + t, await evalJs(`window.__hero.bench(30)`));
  }
}


for (const t of times.split(",").filter(Boolean)) {
  await evalJs(`window.__hero.seek(${t})`);
  await sleep(+(process.env.WAIT ?? 900));
  if (process.env.SCROLL) await evalJs(`window.scrollTo(0, ${+process.env.SCROLL})`);
  if (process.env.FULL) {
    const h = await evalJs(`Math.ceil(document.documentElement.scrollHeight)`);
    await send("Emulation.setDeviceMetricsOverride", { width: +W, height: Math.max(+Hh, h), deviceScaleFactor: +DPR, mobile: +W <= 720 });
    await sleep(500);
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${prefix}-t${t}.png`, Buffer.from(shot.result.data, "base64"));
  console.log("shot", t, "overflowX:", await evalJs(`document.documentElement.scrollWidth - innerWidth`));
  if (process.env.FULL) await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +Hh, deviceScaleFactor: +DPR, mobile: +W <= 720 });
}
chrome.kill("SIGKILL");
process.exit(0);
