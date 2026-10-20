const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2025-11-04 → "04 Nov 2025" (no Date objects, so server and client agree in every timezone) */
export function formatDate(iso: string) {
  return `${iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
}

/** 2025-11-04 → "November 2025" */
export function formatMonth(iso: string) {
  const long = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${long[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
}

export function joinList(items: string[]) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
