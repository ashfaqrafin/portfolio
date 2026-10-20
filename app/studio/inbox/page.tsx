import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isOwner } from "@/lib/auth/guard";
import { inbox, type Message } from "@/lib/inbox";
import { deleteMessage } from "../actions";
import DeleteButton from "../DeleteButton";

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso)) + " UTC";

/** the reply value was normalised by the schema before it was stored */
function ReplyLink({ via, reply }: Pick<Message, "via" | "reply">) {
  if (via === "email") return <a href={`mailto:${reply}`}>Reply by email: {reply}</a>;
  if (via === "whatsapp")
    return (
      <a href={`https://wa.me/${reply.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
        Reply on WhatsApp: {reply}
      </a>
    );
  return (
    <a href={reply} target="_blank" rel="noopener noreferrer">
      Reply via {reply.replace(/^https:\/\/(www\.)?/, "")}
    </a>
  );
}

async function Messages({ searchParams }: { searchParams: PageProps<"/studio/inbox">["searchParams"] }) {
  if (!(await isOwner())) redirect("/signin?callbackUrl=/studio/inbox"); // gate 2

  const [all, sp] = await Promise.all([inbox.list(), searchParams]);
  return (
    <>
      {sp.deleted && (
        <p className="st-toast" role="status">
          Deleted.
        </p>
      )}
      <p className="st-stats">
        {all.length} {all.length === 1 ? "message" : "messages"} from the contact form
      </p>
      {all.length === 0 ? (
        <p className="st-empty">The post box is empty.</p>
      ) : (
        <ol className="st-inbox">
          {all.map((m) => (
            <li key={m.id} className="st-msg">
              <header className="st-msg-head">
                <strong>{m.name || "No name given"}</strong>
                <span>{when(m.createdAt)}</span>
              </header>
              <p className="st-msg-body">{m.message}</p>
              <footer className="st-msg-foot">
                <ReplyLink via={m.via} reply={m.reply} />
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={m.id} />
                  <DeleteButton title={`the message from ${m.name || "this sender"}`} />
                </form>
              </footer>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export default function InboxPage({ searchParams }: PageProps<"/studio/inbox">) {
  return (
    <section className="sheet st-sheet" aria-labelledby="st-h">
      <div className="st-head">
        <div>
          <p className="st-kicker">The studio &middot; contact form</p>
          <h1 className="st-h1" id="st-h">
            Inbox
          </h1>
        </div>
      </div>
      <Suspense fallback={<p className="st-loading">Opening the post box&hellip;</p>}>
        <Messages searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
