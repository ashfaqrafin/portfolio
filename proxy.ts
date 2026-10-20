/* Gate 1 of 3: anyone without an owner session is redirected to /signin before a
   studio page runs. This is a convenience, not the protection: server actions can be
   POSTed to any URL, so every action re-checks with requireOwner(). */
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/studio/:path*"],
};
