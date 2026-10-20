import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isOwner } from "@/lib/auth/guard";
import ImportForm from "./ImportForm";

async function Gate() {
  if (!(await isOwner())) redirect("/signin?callbackUrl=/studio/import"); // gate 2
  return <ImportForm />;
}

export default function ImportPage() {
  return (
    <section className="sheet st-sheet" aria-labelledby="st-import-h">
      <div className="st-head">
        <div>
          <p className="st-kicker">The studio &middot; upload</p>
          <h1 className="st-h1" id="st-import-h">
            Import Markdown
          </h1>
        </div>
      </div>
      <Suspense fallback={<p className="st-loading">Threading the needle&hellip;</p>}>
        <Gate />
      </Suspense>
    </section>
  );
}
