import "server-only";
import { randomUUID } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { messages } from "../db/schema";
import type { Message, MessageStore } from "./types";

const toMessage = (r: typeof messages.$inferSelect): Message => ({
  id: r.id,
  createdAt: r.createdAt.toISOString(),
  name: r.name,
  via: r.via as Message["via"],
  reply: r.reply,
  message: r.message,
});

export const dbInbox: MessageStore = {
  async add(m) {
    const [row] = await getDb()
      .insert(messages)
      .values({ id: randomUUID(), ...m })
      .returning();
    return toMessage(row);
  },
  async list() {
    return (await getDb().select().from(messages).orderBy(desc(messages.createdAt))).map(toMessage);
  },
  async count() {
    const [r] = await getDb().select({ n: count() }).from(messages);
    return r?.n ?? 0;
  },
  async remove(id) {
    await getDb().delete(messages).where(eq(messages.id, id));
  },
};
