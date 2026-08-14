"use client";

import { cn } from "@/lib/utils";

/** Animated "Thinking" indicator featuring Elara's avatar with a pulsing ring
 *  and animated dots. Shown when the assistant is generating a response. */
export function ThinkingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 animate-fade-up", className)}>
      {/* Elara avatar with pulsing ring */}
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#2a2a2e]">
          <img
            src="/elara-avatar.png"
            alt="Elara"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-full border-2 border-[#e8c98f] animate-ping opacity-40" />
      </div>

      {/* Thinking text + animated dots */}
      <div className="flex items-center gap-1.5 bg-[#111118]/70 border border-[#2a2a2e] rounded-2xl rounded-bl-sm px-4 py-3">
        <span className="text-[13px] text-[#9a9aa3] font-medium">Thinking</span>
        <span className="flex gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e8c98f] animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#e8c98f] animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#e8c98f] animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}