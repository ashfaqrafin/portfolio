/* Shared by the schema (server) and the sketchbook (client), so the client
   bundle never pulls in zod. */

export const STATUSES = ["shipped", "in-progress", "archived"] as const;
export type ProjectStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  archived: "Archived",
};
