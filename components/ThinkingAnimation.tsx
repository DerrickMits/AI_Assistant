"use client";

import { cn } from "@/lib/utils";

/** Animated "Thinking" indicator featuring Elara's avatar with a pulsing ring
 *  and animated dots. Shown when the assistant is generating a response.
 *  Mobile-first sizing: scales up on larger screens. */
export function ThinkingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 sm:gap-3 animate-fade-up", className)}>
      {/* Elara avatar with pulsing ring */}
      <div className="relative shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-[#d8d8d8]">
          <img
            src="/elara-avatar.png"
            alt="Elara"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Pulsing ring */}
        <span className="absolute -inset-0.5 sm:-inset-1 rounded-full border-2 border-[#e8c98f] animate-ping opacity-30" />
      </div>

      {/* Thinking bubble with animated dots */}
      <div className="flex items-center gap-1.5 bg-[#f8f6f0]/80 border border-[#e8e8e8] rounded-2xl rounded-bl-sm px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm">
        <span className="text-[12px] sm:text-[13px] text-[#5f5f5f] font-medium tracking-tight">Thinking</span>
        <span className="flex gap-0.5 items-center">
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#e8c98f] animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#e8c98f] animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#e8c98f] animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}