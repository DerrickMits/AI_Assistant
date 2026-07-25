"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Streams-safe markdown renderer used for assistant messages. Disables raw
 * HTML to keep content safe; renders links as-is so the system prompt's
 * citation links come through unstyled-by-default.
 */
export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="chat-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            void node;
            const href = typeof props.href === "string" ? props.href : "";
            const external = href.startsWith("http") || href.startsWith("mailto");
            return (
              <a
                {...props}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              />
            );
          },
          code: ({ className, children, ...props }) => (
            <code className={className} {...props}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
