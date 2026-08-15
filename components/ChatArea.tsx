"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Sparkles, PanelLeftOpen } from "lucide-react";
import type { UIMessage } from "@ai-sdk/ui-utils";
import MarkdownContent from "@/components/MarkdownContent";
import { AIChatInput as InputBar, AttachedFile } from "@/components/ai-chat-input";
import { GeminiStar } from "@/components/icons";
import { ThinkingAnimation } from "@/components/ThinkingAnimation";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  messages: UIMessage[];
  isStreaming: boolean;
  inputValue: string;
  onChangeInput: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onOpenSidebar: () => void;
  sidebarOpen: boolean;
  attachedFiles?: AttachedFile[];
  onAttachFile?: (file: AttachedFile) => void;
  onRemoveFile?: (id: string) => void;
  onVoiceTranscription?: (text: string) => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
}

/** True when the AI is actively producing a response OR has just been
 *  submitted and the first assistant message hasn't appeared yet. */
function useThinkingState(messages: UIMessage[], isStreaming: boolean): boolean {
  const turns = messages.filter((m) => m.role !== "system");
  if (!isStreaming) return false;

  // If last turn is still the user, we're waiting for the assistant to start.
  const last = turns[turns.length - 1];
  if (last && last.role === "user") return true;

  // If last turn is assistant but has no content yet, it's streaming.
  if (last && last.role === "assistant") {
    const hasText = last.parts.some(
      (p): p is Extract<typeof p, { type: "text" }> => p.type === "text" && p.text.trim().length > 0,
    );
    return !hasText;
  }

  return false;
}

export default function ChatArea(props: ChatAreaProps) {
  const {
    messages, isStreaming, inputValue, onChangeInput, onSubmit, onStop, onOpenSidebar, sidebarOpen,
    attachedFiles, onAttachFile, onRemoveFile, onVoiceTranscription, isRecording, onToggleRecording,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const thinking = useThinkingState(messages, isStreaming);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <div className="relative flex-1 h-full flex flex-col min-w-0">
      {/* Floating top-left reveal button when sidebar collased */}
      {!sidebarOpen && (
        <button
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          className="absolute left-3 top-3 z-20 w-10 h-10 grid place-items-center rounded-full text-[#8a8a8a] hover:bg-white/20 transition-colors"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      {/* Floating sparkle widget anchored to right margin */}
      <div className="hidden lg:flex absolute right-5 bottom-28 z-10 pointer-events-none">
        <div
          aria-hidden
          className="sparkle-pulse w-11 h-11 rounded-full bg-[#e8e8e8]/80 backdrop-blur grid place-items-center border border-[#d8d8d8]"
        >
          <Sparkles className="w-5 h-5 text-[#e8c98f]" />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl w-full px-4 sm:px-6">
          {/* Thinking indicator — shown when AI is processing but hasn't started streaming text yet */}
          {thinking && (
            <div className="pt-6">
              <ThinkingAnimation />
            </div>
          )}

          {isEmpty(turns) ? (
            <Greeting onPick={(s) => onChangeInput(s)} />
          ) : (
            <div className="pt-6 pb-8 space-y-6">
              {turns.map((m) => (
                <Message
                  key={m.id}
                  role={m.role}
                  content={textFromParts(m)}
                  isStreaming={isStreaming && m.id === turns[turns.length - 1]?.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-4 pt-2 sm:px-6">
        <InputBar
          value={inputValue}
          onChange={onChangeInput}
          onSubmit={onSubmit}
          onStop={onStop}
          isStreaming={isStreaming}
          attachedFiles={attachedFiles}
          onAttachFile={onAttachFile}
          onRemoveFile={onRemoveFile}
          onVoiceTranscription={onVoiceTranscription}
          isRecording={isRecording}
          onToggleRecording={onToggleRecording}
        />
      </div>
    </div>
  );
}

function isEmpty(messages: UIMessage[]): boolean {
  const turns = messages.filter((m) => m.role !== "system");
  return turns.length === 0;
}

function Greeting({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-fade-up">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#d8d8d8] shadow-2xl shadow-[#e8c98f]/20">
          <img src="/elara-avatar.png" alt="Elara" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#f8f6f0] border-2 border-[#d8d8d8] grid place-items-center">
          <span className="text-[10px] font-bold text-[#e8c98f]">E</span>
        </div>
      </div>
      <h1 className="text-[34px] sm:text-[40px] font-medium tracking-tight text-[#1a1a1a] mb-2">
        Meet <span className="text-[#e8c98f]">Elara</span>
      </h1>
      <p className="mt-2 text-[15px] text-[#5f5f5f] mb-1">
        Derrick&apos;s AI collaborator & operational assistant
      </p>
      <p className="text-[13px] text-[#8a8a8a] max-w-md">
        Ask me anything about Derrick&apos;s career, his articles on The Ledger, or his downloadable blueprints.
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left text-[13px] px-4 py-3 rounded-2xl border border-[#d8d8d8] bg-[#f8f6f0]/70 text-[#1a1a1a] hover:border-[#e8c98f]/30 hover:bg-[#e8e8e8] transition-all duration-200"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ role, content, isStreaming }: { role: string; content: string; isStreaming: boolean }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3 sm:gap-4 animate-fade-up", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "shrink-0 w-8 h-8 rounded-full overflow-hidden",
          isUser
            ? "bg-gradient-to-br from-[#e8c98f] to-[#c8b6ff] flex items-center justify-center text-[12px] font-semibold text-[#1a1a1a]"
            : "border-2 border-[#d8d8d8]",
        )}
      >
        {isUser ? (
          "U"
        ) : (
          <img src="/elara-avatar.png" alt="Elara" className="w-full h-full object-cover" />
        )}
      </div>
      <div className={cn("min-w-0 max-w-full", isUser ? "text-right" : "")}>
        {isUser ? (
          <p className="inline-block text-[15px] text-[#1a1a1a] bg-[#e8e8e8]/20 border border-[#d8d8d8]/40 rounded-2xl rounded-tr-sm px-4 py-2.5 whitespace-pre-wrap">
            {content}
          </p>
        ) : (
          <div className="text-left">
            {content ? (
              <MarkdownContent content={content} />
            ) : isStreaming ? (
              <ThinkingAnimation />
            ) : (
              <span className="text-[#8a8a8a] text-[14px]">Thinking...</span>
            )}
            {isStreaming && content && <span className="caret-blink" />}
          </div>
        )}
      </div>
    </div>
  );
}