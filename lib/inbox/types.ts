import type { ReplyVia } from "./schema.ts";

export type Message = {
  id: string;
  /** ISO timestamp */
  createdAt: string;
  name: string;
  via: ReplyVia;
  reply: string;
  message: string;
};

export interface MessageStore {
  add(m: Omit<Message, "id" | "createdAt">): Promise<Message>;
  /** newest first */
  list(): Promise<Message[]>;
  count(): Promise<number>;
  remove(id: string): Promise<void>;
}
