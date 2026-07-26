"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Mic, Paperclip, Send, Square, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

/**
 * Animated AI chat input (HextaUI-inspired) re-tokened to Derrick's brand:
 * cream card on the dark slate canvas, slate text, gold accents for send.
 *
 * Placeholders cycle portfolio-specific prompts about Derrick's career,
 * his articles on The Ledger, and his downloadable blueprints so every
 * suggestion relates to Derrick's body of work.
 */

const PLACEHOLDERS = [
  "What does Derrick do for a living?",
  "Summarize Derrick's Zapier automation guide",
  "How would Derrick set up GTD in Asana?",
  "Which blueprints cover community building?",
  "Explain Derrick's GoHighLevel workflow architecture",
  "How did Derrick improve executive focus time by 35%?",
  "What is Derrick's negotiation strategy for executive pay?",
  "Walk me through Derrick's Salesforce admin pillars",
];

interface AIChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
}

const AIChatInput = ({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
}: AIChatInputProps) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cycle placeholder text when input is inactive.
  useEffect(() => {
    if (isActive || value) return;
    const interval = setInterval(() => {
      setShowPlaceholder(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        setShowPlaceholder(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive, value]);

  // Close expanded state when clicking outside (unless there is pending text).
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (!value) setIsActive(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleActivate = () => {
    setIsActive(true);
    inputRef.current?.focus();
  };

  const submit = () => {
    if (!value.trim() || isStreaming) return;
    onSubmit();
    // Keep expanded so the user sees the controls; clear handled by parent.
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const containerVariants = {
    collapsed: {
      // 68px input row; we keep the expanded controls hidden in this state.
      height: 72,
      boxShadow: "0 8px 30px -10px rgba(0,0,0,0.6)",
      transition: { type: "spring" as const, stiffness: 120, damping: 18 },
    },
    expanded: {
      height: 132,
      boxShadow: "0 18px 50px -16px rgba(0,0,0,0.7)",
      transition: { type: "spring" as const, stiffness: 120, damping: 18 },
    },
  };

  const placeholderContainerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.025 } },
    exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
  };

  const letterVariants = {
    initial: { opacity: 0, filter: "blur(12px)", y: 10 },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        opacity: { duration: 0.25 },
        filter: { duration: 0.4 },
        y: { type: "spring" as const, stiffness: 80, damping: 20 },
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(12px)",
      y: -10,
      transition: {
        opacity: { duration: 0.2 },
        filter: { duration: 0.3 },
        y: { type: "spring" as const, stiffness: 80, damping: 20 },
      },
    },
  };

  const expanded = isActive || !!value || isStreaming;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        ref={wrapperRef}
        className="w-full"
        variants={containerVariants}
        animate={expanded ? "expanded" : "collapsed"}
        initial="collapsed"
        style={{
          overflow: "hidden",
          borderRadius: 32,
          background: "#FDFBF7", // cream brand card
          border: "1px solid rgba(232,201,143,0.35)",
        }}
        onClick={handleActivate}
      >
        <div className="flex flex-col items-stretch w-full h-full">
          {/* ---------- Input Row ---------- */}
          <div className="flex items-center gap-2 p-3 rounded-full max-w-3xl w-full">
            <button
              className="p-3 rounded-full text-warm-500 hover:bg-warm-100 transition"
              title="Attach file"
              type="button"
              tabIndex={-1}
            >
              <Paperclip size={20} />
            </button>

            {/* Text Input & animated placeholder */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={handleActivate}
                className="flex-1 border-0 outline-0 rounded-md py-2 text-base bg-transparent w-full font-normal text-[#1C1917]"
                style={{ position: "relative", zIndex: 1 }}
                aria-label="Ask Derrick's AI Assistant"
              />
              <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center px-3 py-2">
                <AnimatePresence mode="wait">
                  {showPlaceholder && !isActive && !value && (
                    <motion.span
                      key={placeholderIndex}
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-[#78716C] select-none pointer-events-none"
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        zIndex: 0,
                      }}
                      variants={placeholderContainerVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {PLACEHOLDERS[placeholderIndex]
                        .split("")
                        .map((char, i) => (
                          <motion.span
                            key={i}
                            variants={letterVariants}
                            style={{ display: "inline-block" }}
                          >
                            {char === " " ? "\u00A0" : char}
                          </motion.span>
                        ))}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mic */}
            <button
              className="p-3 rounded-full text-warm-500 hover:bg-warm-100 transition"
              title="Voice input"
              type="button"
              tabIndex={-1}
            >
              <Mic size={20} />
            </button>

            {/* Send / Stop */}
            {isStreaming ? (
              <button
                onClick={(e) => { e.stopPropagation(); onStop(); }}
                className="p-3 rounded-full bg-[#1C1917] text-cream hover:bg-[#0C0A09] transition flex items-center justify-center"
                title="Stop"
                type="button"
                tabIndex={-1}
                aria-label="Stop streaming"
              >
                <Square size={16} className="fill-current" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); submit(); }}
                className="p-3 rounded-full bg-gradient-to-br from-[#e8c98f] to-[#d4a850] text-[#0C0A09] hover:from-[#f3d9b3] hover:to-[#e8c98f] transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send"
                type="button"
                tabIndex={-1}
                disabled={!value.trim()}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            )}
          </div>

          {/* ---------- Expanded Controls ---------- */}
          <motion.div
            className="w-full flex justify-end px-4 items-center text-sm"
            variants={{
              hidden: {
                opacity: 0,
                y: 20,
                pointerEvents: "none" as const,
                transition: { duration: 0.25 },
              },
              visible: {
                opacity: 1,
                y: 0,
                pointerEvents: "auto" as const,
                transition: { duration: 0.35, delay: 0.08 },
              },
            }}
            initial="hidden"
            animate={expanded ? "visible" : "hidden"}
            style={{ marginTop: 8 }}
          >
            {/* Right-side brand hint */}
            <div className="flex items-center gap-1.5 text-[11px] text-warm-400 select-none">
              <Sparkles size={12} className="text-[#e8c98f]" />
              <span>Grounded on Derrick's portfolio</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <p className="text-center text-[11px] text-[#6f6f78] mt-2">
        Derrick's AI Assistant may produce inaccurate info; verify key details.
      </p>
    </div>
  );
};

export { AIChatInput };
