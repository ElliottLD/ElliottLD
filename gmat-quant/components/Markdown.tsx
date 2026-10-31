import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

/** Markdown + LaTeX ($…$, $$…$$). Les dollars littéraux s'écrivent \$. */
export function Markdown({ children, inline = false }: { children: string; inline?: boolean }) {
  return (
    <div className={inline ? "prose-md [&>p]:my-0 [&>p]:inline" : "prose-md"}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
