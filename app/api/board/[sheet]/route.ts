import { getSheet } from "@/lib/blog/data";

/* One sheet of the thread board, for flipping to it without a page load. Public:
   published articles only, the same data the page itself renders. */
export async function GET(_req: Request, { params }: RouteContext<"/api/board/[sheet]">) {
  const { sheet } = await params;
  const n = /^\d{1,4}$/.test(sheet) ? Number(sheet) : -1;
  const data = n >= 0 ? await getSheet(n) : null;
  if (!data) return Response.json({ error: "No such sheet." }, { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } });
}
