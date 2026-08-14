import { cn } from "@/lib/utils";

/** Elara avatar — the AI collaborator's branded face icon. */
export function GeminiStar({ className }: { className?: string }) {
  return (
    <img
      src="/elara-avatar.svg"
      alt="Elara"
      className={cn("inline-block rounded-full object-cover", className)}
      width={24}
      height={24}
    />
  );
}
