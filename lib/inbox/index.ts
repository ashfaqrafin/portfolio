import "server-only";
import { dbInbox } from "./db-store";
import { fileInbox } from "./file-store";
import type { MessageStore } from "./types";

/* Same rule as the articles: Postgres when DATABASE_URL is set, files otherwise. */
export const inbox: MessageStore = process.env.DATABASE_URL ? dbInbox : fileInbox;

export type { Message, MessageStore } from "./types";
