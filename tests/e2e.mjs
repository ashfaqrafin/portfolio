#!/usr/bin/env node
/* End-to-end suite against a running PRODUCTION build (`npm run build && npm start`).

     AUTH_SECRET=... OWNER_GITHUB_ID=... BASE_URL=http://localhost:3000 npm run test:e2e

   Values missing from the environment are read from .env.local. Session cookies are
   minted fresh with the real secret (scripts/mint-session.mjs), so the gates are
   exercised for real; the owner "control" replay proves the minted token works, so a
   denial can never pass just because a token expired.

   It creates and deletes articles whose slugs start with "e2e-". Store-agnostic: it
   observes the store only through HTTP. Browser: CHROMIUM_PATH or /usr/bin/chromium. */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const env = { ...readEnvFile(path.join(ROOT, ".env.local")), ...process.env };
const BASE = (env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const COOKIE = "authjs.session-token";
const RUN = Date.now().toString(36);
const NEW_SLUG = `e2e-thread-test-${RUN}`;
const FULL_ONLY = "The full piece is where the seam allowances live.";
const DRAFT_SENTINEL = "DRAFT-SENTINEL";

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter((m) => m && m[2] !== "")
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
}

const mint = (kind) =>
  execFileSync(process.execPath, [path.join(ROOT, "scripts/mint-session.mjs"), kind, "4"], {
    env: { ...process.env, AUTH_SECRET: env.AUTH_SECRET, OWNER_GITHUB_ID: env.OWNER_GITHUB_ID },
    encoding: "utf8",
  });

// ── tiny harness ─────────────────────────────────────────────────────────────
const results = [];
async function check(area, name, fn) {
  try {
    await fn();
    results.push({ area, name, ok: true });
    console.log(`  ✓ ${area}: ${name}`);
  } catch (err) {
    results.push({ area, name, ok: false, err });
    console.log(`  ✗ ${area}: ${name}\n      ${String(err?.message ?? err).split("\n")[0]}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const get = (p, cookie, init = {}) =>
  fetch(BASE + p, { redirect: "manual", ...init, headers: { ...(init.headers ?? {}), ...(cookie ? { cookie: `${COOKIE}=${cookie}` } : {}) } });

// published / draft slugs, from the content folder when present (store-agnostic fallback below)
function contentArticles() {
  const dir = path.join(ROOT, "content/articles");
  if (!existsSync(dir)) return null;
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("e2e-"))
    .map((f) => {
      const text = readFileSync(path.join(dir, f), "utf8");
      return { slug: f.slice(0, -3), draft: /^status:\s*draft\s*$/m.test(text), title: text.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] };
    });
}

// ── run ──────────────────────────────────────────────────────────────────────
assert(env.AUTH_SECRET && env.OWNER_GITHUB_ID, "AUTH_SECRET and OWNER_GITHUB_ID are required");
const health = await fetch(BASE + "/blog").catch(() => null);
assert(health?.ok, `no server at ${BASE} (start one with \`npm start\`)`);

const tokens = { owner: mint("owner"), stranger: mint("stranger"), forged: mint("forged") };
const articles = contentArticles();
const useDb = !!env.DATABASE_URL;
const published = articles && !useDb ? articles.filter((a) => !a.draft) : null;
const draft = articles?.find((a) => a.draft) ?? { slug: "notes-toward-a-capsule-wardrobe", title: "Notes toward a capsule wardrobe" };

const browser = await chromium.launch({ executablePath: env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const jsErrors = [];
const watch = (page, tag) => {
  page.on("pageerror", (e) => jsErrors.push(`${tag}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/.test(m.text())) jsErrors.push(`${tag} console: ${m.text()}`);
  });
};

console.log(`\nThread Board e2e against ${BASE} (${useDb ? "database" : "file"} store)\n`);

// ── visitor reading ─────────────────────────────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
watch(page, "visitor");

await check("visitor", "the board renders every published pin as a real link", async () => {
  const res = await page.goto(BASE + "/blog", { waitUntil: "networkidle" });
  assert(res.status() === 200, `status ${res.status()}`);
  const pins = await page.$$eval("a.tb-pin", (as) => as.map((a) => a.getAttribute("href")));
  if (published) assert(pins.length === published.length, `${pins.length} pins, expected ${published.length}`);
  else assert(pins.length > 0, "no pins");
  assert(pins.every((h) => /^\/blog\/[a-z0-9-]+$/.test(h)), "a pin is not a /blog/<slug> link");
});

await check("visitor", "the draft appears nowhere in public HTML or payloads", async () => {
  for (const p of ["/", "/blog", `/blog/${published?.[0]?.slug ?? "drafting-a-block-pattern-from-scratch"}`]) {
    const html = await (await get(p)).text();
    assert(!html.includes(DRAFT_SENTINEL), `${p} leaks the draft body`);
    assert(!html.includes(draft.slug), `${p} leaks the draft slug`);
    if (draft.title) assert(!html.includes(draft.title), `${p} leaks the draft title`);
  }
  const rsc = await (await get("/blog", null, { headers: { RSC: "1" } })).text();
  assert(!rsc.includes(DRAFT_SENTINEL) && !rsc.includes(draft.slug), "the RSC payload leaks the draft");
});

await check("visitor", "every board sheet serves published data only; the list covers every sheet", async () => {
  let sheets = 0;
  for (; sheets < 500; sheets++) {
    const r = await get(`/api/board/${sheets}`);
    if (r.status === 404) break;
    assert(r.status === 200, `sheet ${sheets} → ${r.status}`);
    const text = await r.text();
    assert(!text.includes(DRAFT_SENTINEL) && !text.includes(draft.slug), `sheet ${sheets} leaks the draft`);
  }
  assert(sheets >= 1, "no sheets");
  for (const bad of ["-1", "abc", "1e3", "99999"]) assert((await get(`/api/board/${bad}`)).status === 404, `/api/board/${bad} is served`);
  const rows = await page.$$eval(".tb-row", (as) => as.length);
  if (published) assert(rows === published.length, `${rows} list rows, expected ${published.length}`);
  const tabs = await page.$$eval(".tb-sheet-tab", (ts) => ts.length);
  assert(tabs === (sheets > 1 ? sheets : 0), `${tabs} sheet tabs for ${sheets} sheets`);
  if (sheets > 1) {
    const before = await page.$$eval("a.tb-pin", (as) => as.map((a) => a.dataset.slug).join());
    await page.click(".tb-sheet-tab >> nth=0");
    await page.waitForFunction((b) => [...document.querySelectorAll("a.tb-pin")].map((a) => a.dataset.slug).join() !== b, before, { timeout: 5000 });
    await page.click(".tb-sheet-tab >> nth=-1");
    await page.waitForFunction((b) => [...document.querySelectorAll("a.tb-pin")].map((a) => a.dataset.slug).join() === b, before, { timeout: 5000 });
  }
});

await check("visitor", "visitors get no owner shortcuts, and don't even ask for a session", async () => {
  const p = await ctx.newPage();
  const asked = [];
  p.on("request", (r) => r.url().includes("/api/auth/session") && asked.push(r.url()));
  await p.goto(BASE + "/blog", { waitUntil: "load" });
  await p.waitForTimeout(1500);
  assert(asked.length === 0, "a visitor's page asked for the session");
  assert((await p.locator(".owner-bar").count()) === 0, "owner shortcuts shown to a visitor");
  // a stale hint in a visitor's browser is checked once and forgotten
  await p.evaluate(() => localStorage.setItem("owner-hint", String(Date.now() + 3600e3)));
  await p.reload({ waitUntil: "load" });
  await p.waitForFunction(() => localStorage.getItem("owner-hint") === null, null, { timeout: 5000 }).catch(() => {});
  assert((await p.locator(".owner-bar").count()) === 0, "a forged hint showed the shortcuts");
  assert((await p.evaluate(() => localStorage.getItem("owner-hint"))) === null, "the stale hint was kept");
  await p.close();
});

await check("visitor", "a pin click opens the popup and changes the URL", async () => {
  await page.click('a.tb-pin[data-slug="drafting-a-block-pattern-from-scratch"]');
  await page.waitForSelector('.tbr-sheet[role="dialog"]', { timeout: 10_000 });
  assert(page.url() === `${BASE}/blog/drafting-a-block-pattern-from-scratch`, `url is ${page.url()}`);
});

await check("visitor", "the board stays mounted under the popup", async () => {
  assert((await page.$$("a.tb-pin")).length > 0 && (await page.$(".tb-stage")), "board unmounted");
  assert(await page.$('a.tb-pin[data-open][data-slug="drafting-a-block-pattern-from-scratch"]'), "open pin not highlighted");
});

await check("visitor", "the popup wears the topic's skin and is an accessible modal", async () => {
  const s = await page.$eval(".tbr-sheet", (el) => ({
    topic: el.dataset.topic,
    modal: el.getAttribute("aria-modal"),
    labelled: !!document.getElementById(el.getAttribute("aria-labelledby") ?? "")?.textContent,
    focus: document.activeElement?.classList.contains("tbr-close"),
  }));
  assert(s.topic === "tailoring", `skin ${s.topic}`);
  assert(s.modal === "true" && s.labelled, "not an aria-modal dialog labelled by its title");
  assert(s.focus, "focus did not move to the close button");
});

await check("visitor", "Tab stays inside the popup", async () => {
  for (let i = 0; i < 14; i++) await page.keyboard.press("Tab");
  assert(await page.evaluate(() => !!document.activeElement?.closest(".tbr-sheet")), "focus escaped the dialog");
});

await check("visitor", "the popup shows only the quick read", async () => {
  const text = await page.$eval(".tbr-body", (el) => el.textContent ?? "");
  assert(text.includes("Every garment"), "quick read missing");
  assert(!text.includes(FULL_ONLY), "the full body leaked into the quick read");
});

await check("visitor", "following a thread swaps the article without growing history", async () => {
  const before = await page.evaluate(() => history.length);
  const href = await page.$eval(".tbr-threads a", (a) => a.getAttribute("href"));
  await page.click(".tbr-threads a");
  await page.waitForURL(BASE + href, { timeout: 10_000 });
  await page.waitForFunction((h) => document.querySelector(".tbr-title")?.textContent && location.pathname === h, href);
  assert((await page.evaluate(() => history.length)) === before, "history grew");
  assert(await page.$(".tbr-sheet"), "the popup closed instead of swapping");
});

await check("visitor", "Esc closes the popup, back to the board, focus on a pin", async () => {
  await page.keyboard.press("Escape");
  await page.waitForURL(BASE + "/blog", { timeout: 10_000 });
  await page.waitForSelector(".tbr-sheet", { state: "detached", timeout: 5_000 });
  await page.waitForTimeout(100);
  assert(await page.evaluate(() => !!document.activeElement?.classList.contains("tb-pin")), "focus not returned to the pin");
});

await check("full page", '"Read the full article" opens the separate full page', async () => {
  await page.click('a.tb-pin[data-slug="drafting-a-block-pattern-from-scratch"]');
  await page.waitForSelector(".tbr-sheet");
  await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".tbr-primary")]);
  assert(!(await page.$(".tbr-sheet")), "still a popup");
  const body = await page.$eval(".art", (el) => el.textContent ?? "");
  assert(body.includes(FULL_ONLY), "full body missing");
  assert(body.includes("Threads from this piece"), "thread list missing");
});

await check("full page", "a direct visit shows the full page, no popup, with metadata", async () => {
  const p2 = await ctx.newPage();
  watch(p2, "direct");
  await p2.goto(BASE + "/blog/ricing-my-dotfiles-part-2-automate-everything", { waitUntil: "networkidle" });
  assert(await p2.$(".art") && !(await p2.$(".tbr-sheet")), "not the full page");
  const og = await p2.$eval('meta[property="og:type"]', (m) => m.content).catch(() => null);
  assert(og === "article", "missing og:type article");
  await p2.close();
});

await check("full page", "a draft URL is a 404 that leaks nothing", async () => {
  const res = await get(`/blog/${draft.slug}`);
  const html = await res.text();
  assert(res.status === 404, `status ${res.status}`);
  assert(!html.includes(DRAFT_SENTINEL), "draft body in the 404");
});

await check("full page", "an unknown or malicious slug is a 404", async () => {
  for (const p of ["/blog/no-such-piece", "/blog/..%2F..%2Fetc%2Fpasswd", "/blog/UPPER"]) {
    const res = await get(p);
    assert(res.status === 404, `${p} → ${res.status}`);
  }
});

await check("visitor", "list view lists the articles", async () => {
  await page.goto(BASE + "/blog", { waitUntil: "networkidle" });
  await page.click('.tb-view:has-text("List")');
  const rows = await page.$$eval(".tb-row", (r) => r.length);
  assert(rows === (published?.length ?? rows) && rows > 0, `${rows} rows`);
});

await check("visitor", "without JavaScript, pins are links to the full page", async () => {
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const p = await noJs.newPage();
  await p.goto(BASE + "/blog");
  await Promise.all([p.waitForNavigation(), p.click('a.tb-pin[data-slug="why-i-live-in-the-terminal"]')]);
  assert(p.url() === `${BASE}/blog/why-i-live-in-the-terminal`, p.url());
  assert(await p.$(".art"), "full page missing");
  await noJs.close();
});

// ── home page intro ─────────────────────────────────────────────────────────
await check("intro", "a first visit opens with the intro, and a click skips it", async () => {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  watch(p, "intro");
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector(".intro", { state: "visible", timeout: 5000 });
  await p.mouse.click(640, 450);
  const t0 = Date.now();
  await p.waitForFunction(() => document.documentElement.dataset.intro === "seen", null, { timeout: 2500 });
  assert(Date.now() - t0 < 1500, "skipping took too long");
  assert(!(await p.locator(".intro").isVisible()), "the intro is still showing");
  await c.close();
});

await check("intro", "never on a reload, a deep link or another page first", async () => {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  await p.goto(BASE + "/#projects", { waitUntil: "load" });
  assert(!(await p.locator(".intro").isVisible()), "intro on a deep link");
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await c2.newPage();
  await p2.goto(BASE + "/blog", { waitUntil: "load" });
  await p2.goto(BASE + "/", { waitUntil: "load" });
  assert(!(await p2.locator(".intro").isVisible()), "intro after arriving on another page");
  const c3 = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const p3 = await c3.newPage();
  await p3.goto(BASE + "/", { waitUntil: "load" });
  assert(!(await p3.locator(".intro").isVisible()), "intro with reduced motion");
  await Promise.all([c.close(), c2.close(), c3.close()]);
});

// ── projects sketchbook ─────────────────────────────────────────────────────
const projectFiles = readdirSync(path.join(ROOT, "content/projects")).filter((f) => f.endsWith(".md"));
const draftProjects = projectFiles.filter((f) => /^draft:\s*true\s*$/m.test(readFileSync(path.join(ROOT, "content/projects", f), "utf8")));

await check("projects", "every page is in the home page HTML, drafts are not", async () => {
  const html = await (await get("/")).text();
  const pages = html.match(/class="pj-page"/g)?.length ?? 0;
  assert(pages === projectFiles.length - draftProjects.length, `${pages} pages for ${projectFiles.length - draftProjects.length} projects`);
  for (const f of draftProjects) assert(!html.includes(`project-${f.slice(0, -3)}`), `draft ${f} is public`);
});

await check("projects", "links are plain web links that open safely in a new tab", async () => {
  const p = await ctx.newPage();
  watch(p, "projects");
  await p.goto(BASE + "/", { waitUntil: "load" });
  const links = await p.$$eval(".pj-link", (as) => as.map((a) => [a.getAttribute("href"), a.target, a.rel]));
  assert(links.length > 0, "no project links");
  for (const [href, target, rel] of links) {
    assert(/^https?:\/\//.test(href), `unsafe href ${href}`);
    assert(target === "_blank" && /noopener/.test(rel) && /noreferrer/.test(rel), `${href} opens without noopener`);
  }
  await p.close();
});

await check("projects", "turning a page lands on the next one and draws it", async () => {
  const p = await ctx.newPage();
  watch(p, "projects");
  await p.goto(BASE + "/#projects", { waitUntil: "load" });
  await p.waitForSelector(".pj-page[data-role=top][data-draw=go]", { timeout: 5000 });
  await p.getByRole("button", { name: "Next page" }).click();
  await p.waitForSelector(".pj-page[data-role=leaf]", { timeout: 2000 });
  await p.waitForFunction(() => document.querySelector('.pj-tab[aria-current="page"] .pj-tab-no')?.textContent === "02", null, { timeout: 3000 });
  const top = await p.$eval(".pj-page[data-role=top]", (e) => [e.id, e.dataset.draw]);
  assert(top[1] === "go", `the new page is ${top[1]}, not drawing`);
  const hidden = await p.$$eval(".pj-page:not([data-role=top])", (es) => es.every((e) => e.inert && e.getAttribute("aria-hidden") === "true"));
  assert(hidden, "pages that aren't showing are still reachable");
  await p.keyboard.press("ArrowLeft");
  await p.waitForFunction(() => document.querySelector('.pj-tab[aria-current="page"] .pj-tab-no')?.textContent === "01", null, { timeout: 3000 });
  await p.close();
});

await check("hygiene", "security headers are set", async () => {
  const h = (await get("/blog")).headers;
  assert(h.get("x-content-type-options") === "nosniff", "nosniff");
  assert(h.get("x-frame-options") === "DENY", "frame");
  assert(/strict-origin/.test(h.get("referrer-policy") ?? ""), "referrer");
});

// ── access control ──────────────────────────────────────────────────────────
for (const [who, token] of [
  ["a visitor", null],
  ["a signed-in stranger", tokens.stranger],
  ["a forged isOwner token", tokens.forged],
]) {
  await check("access", `${who} is sent away from /studio and /studio/new`, async () => {
    for (const p of ["/studio", "/studio/new", "/studio/drafting-a-block-pattern-from-scratch"]) {
      const res = await get(p, token);
      const loc = res.headers.get("location") ?? "";
      assert(res.status >= 300 && res.status < 400 && /\/signin/.test(loc), `${p} → ${res.status} ${loc}`);
      const body = await res.text();
      assert(!body.includes(DRAFT_SENTINEL) && !body.includes(draft.slug), `${p} leaked studio content`);
    }
  });
}

await check("access", "the sign-in page offers GitHub only", async () => {
  const html = await (await get("/signin")).text();
  assert(html.includes("Sign in with GitHub"), "no GitHub button");
  assert(!/password|sign up|register/i.test(html), "unexpected auth options");
});

// ── contact form ────────────────────────────────────────────────────────────
const stamp = Date.now();
const API_LINE = `e2e-contact-api-${stamp}`;
const UI_LINE = `e2e-contact-ui-${stamp}`;
const BOT_LINE = `e2e-contact-bot-${stamp}`;
const contactBody = (over = {}) =>
  JSON.stringify({ message: `Hello from the test suite. ${API_LINE}`, name: "E2E", via: "email", reply: "e2e@example.com", elapsed: 9000, ...over });
const postContact = (body, headers = {}) =>
  fetch(BASE + "/api/contact", { method: "POST", headers: { "content-type": "application/json", origin: BASE, ...headers }, body });

await check("contact", "a message is accepted; bad ones are refused with a reason", async () => {
  const good = await postContact(contactBody());
  assert(good.status === 200 && (await good.json()).ok === true, `good message → ${good.status}`);
  const cases = [
    [contactBody({ message: "too short" }), {}, 400, "message"],
    [contactBody({ via: "social", reply: "https://evil.example/in/x" }), {}, 400, "reply"],
    [contactBody({ via: "whatsapp", reply: "not a number" }), {}, 400, "reply"],
    [contactBody({ isOwner: true }), {}, 400, null],
    [contactBody(), { origin: "https://evil.example" }, 403, null],
    ["x".repeat(9000), {}, 413, null],
    ["{not json", {}, 400, null],
  ];
  for (const [body, headers, status, field] of cases) {
    const res = await postContact(body, headers);
    assert(res.status === status, `expected ${status}, got ${res.status}`);
    if (field) assert((await res.json()).fields?.[field], `no reason given for ${field}`);
  }
});

await check("contact", "bots (honeypot filled, or sent too fast) get an ok and nothing is stored", async () => {
  for (const over of [{ website: "http://spam.example", message: `Buy now! ${BOT_LINE}` }, { elapsed: 300, message: `Too quick ${BOT_LINE}` }]) {
    const res = await postContact(contactBody(over));
    assert(res.status === 200 && (await res.json()).ok === true, `bot got ${res.status}`);
  }
});

for (const [who, token] of [
  ["a visitor", null],
  ["a signed-in stranger", tokens.stranger],
  ["a forged isOwner token", tokens.forged],
]) {
  await check("contact", `${who} cannot open the inbox`, async () => {
    const res = await get("/studio/inbox", token);
    const loc = res.headers.get("location") ?? "";
    assert(res.status >= 300 && res.status < 400 && /\/signin/.test(loc), `/studio/inbox → ${res.status} ${loc}`);
    assert(!(await res.text()).includes(API_LINE), "the inbox leaked a message");
  });
}

await check("contact", "the form sends a message through the pipeline", async () => {
  const p = await ctx.newPage();
  watch(p, "contact");
  await p.goto(BASE + "/#contact", { waitUntil: "load" });
  await p.locator(".ct-textarea").fill(`Hello through the pipeline. ${UI_LINE}`);
  await p.locator(".ct-input").first().fill("e2e-ui@example.com");
  await p.waitForTimeout(2700); // a person takes longer than 2.5 s
  await p.locator(".ct-btn").click();
  // the tailor starts weaving at once, and the coder takes over
  await p.waitForSelector(".pl[data-act='1']", { timeout: 2000 });
  await p.waitForSelector(".pl[data-act='2'] .pl-block[data-broken]", { timeout: 5000 });
  await p.waitForFunction(() => /received/i.test(document.querySelector(".ct-status")?.textContent ?? ""), null, { timeout: 15_000 });
  assert(await p.locator(".pl[data-act='5'] .pl-received").isVisible(), "the scene didn't finish at the post box");
  assert(await p.locator(".ct-thanks").isVisible(), "no thank-you after sending");
  await p.close();
});

// ── owner flow ──────────────────────────────────────────────────────────────
const host = new URL(BASE).hostname;
const ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await ownerCtx.addCookies([{ name: COOKIE, value: tokens.owner, domain: host, path: "/", httpOnly: true, sameSite: "Lax" }]);
const op = await ownerCtx.newPage();
watch(op, "owner");
op.on("dialog", (d) => d.accept());
let saveRequest = null;
op.on("request", (r) => {
  if (r.method() === "POST" && r.headers()["next-action"] && (r.postData() ?? "").includes(NEW_SLUG)) saveRequest = r;
});
const studioSlugs = async (token = tokens.owner) => {
  const html = await (await get("/studio", token)).text();
  return [...html.matchAll(/data-slug="([a-z0-9-]+)"/g)].map((m) => m[1]);
};

await check("contact", "the owner reads messages in the studio inbox, and deletes them", async () => {
  await op.goto(BASE + "/studio/inbox", { waitUntil: "load" });
  const html = await op.content();
  assert(html.includes(API_LINE) && html.includes(UI_LINE), "a message is missing from the inbox");
  assert(!html.includes(BOT_LINE), "a bot's message was stored");
  for (const line of [API_LINE, UI_LINE]) {
    await op.locator(".st-msg", { hasText: line }).getByRole("button", { name: "Delete" }).click();
    await op.waitForURL(/\/studio\/inbox\?deleted=1/, { timeout: 10_000 });
    // the refreshed list streams in after the URL changes
    await op
      .waitForFunction((l) => !document.body.innerText.includes(l), line, { timeout: 10_000 })
      .catch(() => assert(false, `${line} is still in the inbox`));
  }
});

await check("owner", "after the studio, the public pages offer Write, and Edit on an article", async () => {
  await op.goto(BASE + "/studio", { waitUntil: "load" });
  await op.goto(BASE + "/blog", { waitUntil: "load" });
  await op.waitForSelector(".owner-bar", { timeout: 5000 });
  assert((await op.getAttribute(".owner-bar-main", "href")) === "/studio/new", "Write doesn't lead to a new article");
  const slug = published?.[0]?.slug ?? "drafting-a-block-pattern-from-scratch";
  await op.goto(`${BASE}/blog/${slug}`, { waitUntil: "load" });
  await op.waitForSelector(`.owner-bar a[href="/studio/${slug}"]`, { timeout: 5000 });
});

await check("owner", "the owner sees the studio, drafts included", async () => {
  const res = await op.goto(BASE + "/studio", { waitUntil: "networkidle" });
  assert(res.status() === 200 && op.url() === BASE + "/studio", `landed on ${op.url()}`);
  assert(await op.$(`tr[data-slug="${draft.slug}"] .st-badge[data-status="draft"]`), "draft not listed");
});

await check("owner", "the thread preview lists a ticked connection", async () => {
  await op.goto(BASE + "/studio/new", { waitUntil: "networkidle" });
  await op.fill("#f-title", `E2E thread test ${RUN}`);
  await op.fill("#f-slug", NEW_SLUG);
  await op.fill("#f-excerpt", "Written by the end-to-end suite.");
  await op.selectOption("#f-topic", "linux");
  await op.fill("#f-tags", "e2e, testing");
  await op.selectOption("#f-status", "published");
  await op.fill("#f-body", "First paragraph of the test.\n\nSecond paragraph.\n\n<!--more-->\n\nThe rest.");
  await op.check('input[name="connect"][value="why-i-live-in-the-terminal"]');
  const text = await op.$eval('[data-testid="thread-preview"]', (el) => el.textContent ?? "");
  assert(/builds on/i.test(text) && text.includes("Why I live in the terminal"), `preview: ${text}`);
});

await check("owner", "saving publishes the article and its pin appears on the board", async () => {
  await Promise.all([op.waitForURL(/\/studio\?saved=/, { timeout: 15_000 }), op.click('button[type="submit"].st-primary')]);
  assert((await studioSlugs()).includes(NEW_SLUG), "not in the store");
  const html = await (await get("/blog")).text();
  assert(html.includes(`data-slug="${NEW_SLUG}"`), "no pin on the board");
  const art = await get(`/blog/${NEW_SLUG}`);
  assert(art.status === 200, `article page ${art.status}`);
});

// ── replay attacks ─────────────────────────────────────────────────────────
async function replay(token, slug, target = "/blog") {
  assert(saveRequest, "the owner's save request was not captured");
  const headers = { ...saveRequest.headers() };
  for (const h of ["cookie", "content-length", "host", "connection", "origin", "referer"]) delete headers[h];
  headers.origin = BASE;
  const body = saveRequest.postDataBuffer().toString("latin1").split(NEW_SLUG).join(slug);
  const res = await fetch(BASE + target, {
    method: "POST",
    redirect: "manual",
    headers: { ...headers, ...(token ? { cookie: `${COOKIE}=${token}` } : {}) },
    body: Buffer.from(body, "latin1"),
  });
  await res.text();
  return res;
}

for (const [who, token] of [
  ["no cookie", null],
  ["a stranger's session", tokens.stranger],
  ["a forged isOwner session", tokens.forged],
]) {
  await check("replay", `the save request replayed with ${who} writes nothing`, async () => {
    const slug = `e2e-replay-${who.replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}-${RUN}`;
    const res = await replay(token, slug);
    assert(!(await studioSlugs()).includes(slug), "the article was written!");
    assert(!res.headers.get("x-action-redirect"), `the action redirected as if it succeeded (${res.status})`);
  });
}

const CONTROL = `e2e-replay-control-${RUN}`;
await check("replay", "control: the same replay with the owner session does write", async () => {
  const res = await replay(tokens.owner, CONTROL);
  assert((await studioSlugs()).includes(CONTROL), `the owner replay did not write (status ${res.status}), so the denials above prove nothing`);
});

// ── uploads ────────────────────────────────────────────────────────────────
const IMPORT_SLUG = `e2e-import-${RUN}`;
// Chromium doesn't expose request bodies that contain files, so record the upload
// inside the page: wrap fetch and serialise the action's FormData exactly as sent.
let importRequest = null;
const recordUploads = () =>
  op.evaluate(() => {
    const orig = window.fetch;
    window.fetch = async function (input, init) {
      try {
        const h = new Headers(init?.headers);
        if (init?.method === "POST" && h.get("next-action") && init.body instanceof FormData) {
          const r = new Response(init.body);
          const bytes = new Uint8Array(await r.arrayBuffer());
          let bin = "";
          for (const x of bytes) bin += String.fromCharCode(x);
          window.__upload = { headers: Object.fromEntries(h), type: r.headers.get("content-type"), body: btoa(bin) };
        }
      } catch {}
      return orig.call(this, input, init);
    };
  });

await check("owner", "uploading a .md file creates a draft that stays private", async () => {
  await op.goto(BASE + "/studio/import", { waitUntil: "networkidle" });
  await op.setInputFiles('input[type="file"][name="files"]', {
    name: `${IMPORT_SLUG}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from(`---\ntopic: linux\ntags: [e2e]\n---\n# Imported ${RUN}\n\nFirst paragraph.\n\nSecond paragraph.\n`),
  });
  await recordUploads();
  await op.click('button[type="submit"].st-primary');
  await op.waitForSelector(`tr[data-slug="${IMPORT_SLUG}"][data-outcome="created"]`, { timeout: 15_000 });
  importRequest = await op.evaluate(() => window.__upload ?? null);
  assert((await studioSlugs()).includes(IMPORT_SLUG), "not in the store");
  assert((await get(`/blog/${IMPORT_SLUG}`)).status === 404, "an imported draft is public");
});

const IMPORT_CONTROL = `e2e-import-replay-control-${RUN}`;
for (const [who, token, control] of [
  ["no cookie", null, false],
  ["a stranger's session", tokens.stranger, false],
  ["the owner session (control)", tokens.owner, true],
]) {
  await check("replay", control ? "control: the same upload replay with the owner session does write" : `the upload replayed with ${who} writes nothing`, async () => {
    assert(importRequest, "the owner's upload request was not captured");
    const slug = control ? IMPORT_CONTROL : `e2e-import-replay-${who.replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}-${RUN}`;
    const headers = { ...importRequest.headers, "content-type": importRequest.type, origin: BASE };
    const body = Buffer.from(importRequest.body, "base64").toString("latin1").split(IMPORT_SLUG).join(slug);
    const res = await fetch(BASE + "/blog", {
      method: "POST",
      redirect: "manual",
      headers: { ...headers, ...(token ? { cookie: `${COOKIE}=${token}` } : {}) },
      body: Buffer.from(body, "latin1"),
    });
    await res.text();
    const written = (await studioSlugs()).includes(slug);
    if (control) assert(written, `the owner replay did not write (status ${res.status}), so the denials above prove nothing`);
    else assert(!written, "the upload was written!");
  });
}

await check("owner", "deleting removes the article and its pin", async () => {
  for (const slug of [NEW_SLUG, CONTROL, IMPORT_SLUG, IMPORT_CONTROL]) {
    // not "networkidle": after a write, Next keeps background prefetches of the
    // regenerating pages open, which never lets the network go idle
    await op.goto(BASE + "/studio", { waitUntil: "load" });
    const btn = await op.waitForSelector(`tr[data-slug="${slug}"] button.st-danger`, { timeout: 10_000 }).catch(() => null);
    assert(btn, `no delete button for ${slug}`);
    await Promise.all([op.waitForURL(/\/studio\?deleted=1/, { timeout: 15_000 }), btn.click()]);
  }
  const slugs = await studioSlugs();
  for (const s of [NEW_SLUG, CONTROL, IMPORT_SLUG, IMPORT_CONTROL]) assert(!slugs.includes(s), `${s} still in the store`);
  assert(!(await (await get("/blog")).text()).includes(`data-slug="${NEW_SLUG}"`), "pin still on the board");
  assert((await get(`/blog/${NEW_SLUG}`)).status === 404, "article page still served");
});

await check("hygiene", "no JavaScript errors during the run", async () => {
  assert(jsErrors.length === 0, jsErrors.join("\n      "));
});

await browser.close();

// leftovers from an aborted run (file store only)
if (!useDb) {
  const left = readdirSync(path.join(ROOT, "content/articles")).filter((f) => f.startsWith("e2e-"));
  if (left.length) console.log(`\n  note: leftover test files: ${left.join(", ")}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
