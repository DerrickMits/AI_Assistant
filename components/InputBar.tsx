"use client";

import { useRef, type KeyboardEvent } from "react";
import {
  Plus,
  ArrowUp,
  Square,
  ChevronDown,
  Mic,
  Sparkles,
  Globe,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelId } from "@/lib/site";

interface InputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  model: ModelId;
  onPickModel: (m: ModelId) => void;
  modelMenuOpen: boolean;
  onToggleModelMenu: () => void;
}

export default function InputBar({
  value, onChange, onSubmit, onStop, isStreaming, model, onPickModel, modelMenuOpen, onToggleModelMenu,
}: InputBarProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const autosize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isStreaming) onSubmit();
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="rounded-[28px] bg-[#1a1a1f]/90 border border-[#2a2a2e] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-sm focus-within:border-[#3a3a40] transition-colors">
        <div className="flex items-end gap-2 px-3 pt-2.5 pb-1.5">
          {/* Attachments */}
          <button
            aria-label="Attachments"
            className="shrink-0 w-9 h-9 grid place-items-center rounded-full text-[#a0a0aa] hover:bg-white/5 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>

          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => { onChange(e.target.value); autosize(); }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask Derrick's AI Assistant..."
            className="flex-1 resize-none bg-transparent outline-none text-[15px] text-[#e8e8ee] placeholder:text-[#7c7d85] py-2 max-h-[200px]"
          />

          {/* Right controls cluster */}
          <div className="flex items-center gap-1 pb-1">
            <button
              aria-label="Microphone"
              className="shrink-0 w-9 h-9 grid place-items-center rounded-full text-[#a0a0aa] hover:bg-white/5 transition-colors"
            >
              <Mic className="w-5 h-5" />
            </button>

            <ModelSelector model={model} onPick={onPickModel} open={modelMenuOpen} onToggle={onToggleModelMenu} />

            {isStreaming ? (
              <button
                onClick={onStop}
                aria-label="Stop streaming"
                className="shrink-0 w-9 h-9 grid place-items-center rounded-full bg-[#e8c98f] text-[#0f0f11] hover:bg-[#f3d9b3] transition-colors"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : value.trim() ? (
              <button
                onClick={onSubmit}
                aria-label="Send"
                className="shrink-0 w-9 h-9 grid place-items-center rounded-full bg-[#e8c98f] text-[#0f0f11] hover:bg-[#f3d9b3] transition-colors"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Suggested pills row */}
        <div className="flex items-center gap-2 px-3 pb-2 pt-1 overflow-x-auto no-scrollbar">
          <Pill icon={<Globe className="w-3.5 h-3.5" />} label="Search" />
          <Pill icon={<Sliders className="w-3.5 h-3.5" />} label="Deep Research" />
          <Pill icon={<Sparkles className="w-3.5 h-3.5" />} label="2.5 Pro" />
        </div>
      </div>

      <p className="text-center text-[11px] text-[#6f6f78] mt-2">
        Derrick's AI Assistant may produce inaccurate info; verify key details.
      </p>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border border-[#2a2a2e] bg-[#18181b] text-[12px] text-[#a0a0aa] whitespace-nowrap">
      {icon}
      {label}
    </span>
  );
}

function ModelSelector({
  model, onPick, open, onToggle,
}: {
  model: ModelId;
  onPick: (m: ModelId) => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative shrink-0">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1 h-9 px-2.5 rounded-full text-[13px] text-[#c9c9d1] hover:bg-white/5 transition-colors"
      >
        {model === "pro" ? "Pro" : "Flash"}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-11 w-48 rounded-xl border border-[#2a2a2e] bg-[#18181b] shadow-xl p-1 z-30">
          {[
            { id: "flash" as const, label: "Gemini 2.5 Flash", hint: "Fast, efficient" },
            { id: "pro" as const, label: "Gemini 2.5 Pro", hint: "Strongest reasoning" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => { onPick(m.id); onToggle(); }}
              className={cn(
                "w-full flex flex-col items-start px-2.5 py-2 rounded-lg text-left hover:bg-white/5 transition-colors",
                model === m.id && "bg-white/5",
              )}
            >
              <span className="text-[13px] text-[#e8e8ee]">{m.label}</span>
              <span className="text-[11px] text-[#7c7d85]">{m.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
