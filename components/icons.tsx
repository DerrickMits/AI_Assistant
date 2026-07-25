import { cn } from "@/lib/utils";

/** Gemini-style centered four-color starburst used in the sidebar + greeting. */
export function GeminiStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("inline-block", className)}
      fill="none"
    >
      <path d="M12 0c0 6 6 6 6 12s-6 6-6 12c0-6-6-6-6-12s6-6 6-12z" fill="url(#g)" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8c98f" />
          <stop offset="0.5" stopColor="#f3d9b3" />
          <stop offset="1" stopColor="#c8b6ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
