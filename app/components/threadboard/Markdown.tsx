import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import "./markdown.css";

/* Server-rendered Markdown. Raw HTML is skipped (never parsed into elements) and
   react-markdown's default URL transform strips javascript:, data: and other
   unsafe schemes. Never swap this for MDX: MDX executes code. */

const components: Components = {
  a({ href, children }) {
    const external = typeof href === "string" && /^https?:\/\//i.test(href);
    return external ? (
      <a href={href} rel="noopener noreferrer nofollow" target="_blank">
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    );
  },
  pre({ node, children }) {
    const code = node?.children?.[0];
    const cls = code && code.type === "element" ? code.properties?.className : undefined;
    const lang = Array.isArray(cls) ? String(cls.find((c) => String(c).startsWith("language-")) ?? "").slice(9) : "";
    return (
      <figure className="md-code" data-lang={lang || undefined}>
        <figcaption aria-hidden="true">
          <span className="md-dots" />
          {lang || "text"}
        </figcaption>
        <pre>{children}</pre>
      </figure>
    );
  },
  table({ children }) {
    return (
      <div className="md-table">
        <table>{children}</table>
      </div>
    );
  },
  img({ src, alt }) {
    // eslint-disable-next-line @next/next/no-img-element
    return typeof src === "string" ? <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" /> : null;
  },
};

export default function Markdown({ source, className = "md" }: { source: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
