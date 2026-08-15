"use client";

import { cn } from "@/lib/utils";
import Spiral from "@/components/ui/spiral";

/** Premium thinking indicator featuring Elara's avatar and the Spiral loader.
 *  Shows when the assistant is generating a response.
 *  Mobile-first sizing: scales up on larger screens. */
export function ThinkingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 sm:gap-3 animate-fade-up", className)}>
      {/* Elara avatar with subtle pulsing ring */}
      <div className="relative shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-[#d8d8d8]">
          <img
            src="/elara-avatar.png"
            alt="Elara"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="absolute -inset-0.5 sm:-inset-1 rounded-full border border-[#e8c98f]/40 animate-pulse" />
      </div>

      {/* Thinking bubble with Spiral animation */}
      <div className="flex items-center gap-2 bg-[#f8f6f0]/80 border border-[#e8e8e8] rounded-2xl rounded-bl-sm px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm">
        <span className="text-[12px] sm:text-[13px] text-[#5f5f5f] font-medium tracking-tight">Thinking</span>
        <Spiral
          className="text-[#e8c98f] size-5 sm:size-6"
          dots={6}
          radius={24}
        />
      </div>
    </div>
  );
}