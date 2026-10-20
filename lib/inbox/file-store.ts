import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Message, MessageStore } from "./types";

/* JSON files in .data/inbox (git-ignored). For local development and
   self-hosting; a serverless host's disk is read-only, so production uses the
   database store (DATABASE_URL). */

const DIR = path.join(process.cwd(), ".data", "inbox");
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function fileFor(id: string) {
  if (!ID_RE.test(id)) throw new Error("[inbox] invalid id");
  return path.join(DIR, `${id}.json`);
}

async function readAll(): Promise<Message[]> {
  let names: string[];
  try {
    names = await readdir(DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const ids = names.filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).filter((id) => ID_RE.test(id));
  const all = await Promise.all(ids.map(async (id) => JSON.parse(await readFile(fileFor(id), "utf8")) as Message));
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export const fileInbox: MessageStore = {
  async add(m) {
    const msg: Message = { id: randomUUID(), createdAt: new Date().toISOString(), ...m };
    await mkdir(DIR, { recursive: true });
    const file = fileFor(msg.id);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(msg, null, 2), "utf8");
    await rename(tmp, file);
    return msg;
  },
  list: readAll,
  async count() {
    return (await readAll()).length;
  },
  async remove(id) {
    try {
      await unlink(fileFor(id));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  },
};
