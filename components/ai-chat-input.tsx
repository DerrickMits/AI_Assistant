"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Paperclip, Send, Square, Sparkles, X, FileText, Mic2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

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

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
}

interface AIChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  attachedFiles?: AttachedFile[];
  onAttachFile?: (file: AttachedFile) => void;
  onRemoveFile?: (id: string) => void;
  onVoiceTranscription?: (text: string) => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
}

const AIChatInput = ({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  attachedFiles = [],
  onAttachFile,
  onRemoveFile,
  onVoiceTranscription,
  isRecording = false,
  onToggleRecording,
}: AIChatInputProps) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!value && attachedFiles.length === 0) setIsActive(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, attachedFiles.length]);

  const handleActivate = () => {
    setIsActive(true);
    inputRef.current?.focus();
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(async (file) => {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} not supported. Please use PDF, DOC, DOCX, TXT, PNG, JPG, GIF, or WebP.`);
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
      
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const attachedFile: AttachedFile = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
      };
      
      onAttachFile?.(attachedFile);
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onAttachFile]);

  const submit = () => {
    if (!value.trim() && attachedFiles.length === 0 || isStreaming) return;
    onSubmit();
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

  const expanded = isActive || !!value || isStreaming || attachedFiles.length > 0;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileText className="w-4 h-4 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="w-4 h-4 text-blue-600" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        ref={wrapperRef}
        className={cn("w-full", isStreaming && "thinking-glow")}
        variants={containerVariants}
        animate={expanded ? "expanded" : "collapsed"}
        initial="collapsed"
        style={{
          overflow: "hidden",
          borderRadius: 32,
          background: "#FDFBF7",
          border: "1px solid rgba(232,201,143,0.35)",
        }}
        onClick={handleActivate}
      >
        <div className="flex flex-col items-stretch w-full h-full">
          {/* ---------- Input Row ---------- */}
          <div className="flex items-center gap-2 p-3 rounded-full max-w-3xl w-full">
            {/* Paperclip - File Attachment */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
                aria-label="Attach file"
              />
              <button
                className="p-3 rounded-full text-warm-500 hover:bg-warm-100 transition"
                title="Attach file"
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Paperclip size={20} />
              </button>
            </div>

            {/* Text Input & animated placeholder */}
            <div className="relative flex-1 min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={handleActivate}
                className="flex-1 border-0 outline-0 rounded-md py-2 text-base bg-transparent w-full font-normal text-[#1C1917] pr-12"
                style={{ position: "relative", zIndex: 1 }}
                aria-label="Ask Derrick's AI Assistant"
                placeholder=" "
              />
              <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center px-3 py-2">
                <AnimatePresence mode="wait">
                  {showPlaceholder && !isActive && !value && attachedFiles.length === 0 && (
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

            {/* Mic - Voice Recording */}
            <button
              className={`p-3 rounded-full transition ${isRecording ? "bg-red-500 text-white" : "text-warm-500 hover:bg-warm-100"}`}
              title={isRecording ? "Stop recording" : "Voice input"}
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onToggleRecording?.();
              }}
              disabled={isStreaming}
              aria-label={isRecording ? "Stop recording" : "Start voice recording"}
            >
              {isRecording ? <Mic2 size={20} /> : <Mic size={20} />}
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
                disabled={!value.trim() && attachedFiles.length === 0}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            )}
          </div>

          {/* ---------- Attached Files Preview ---------- */}
          {attachedFiles.length > 0 && (
            <motion.div
              className="w-full px-4 pb-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-warm-100 rounded-full text-sm"
                  >
                    <span className="flex items-center">{getFileIcon(file.type)}</span>
                    <span className="text-[#1C1917] truncate max-w-[150px]">{file.name}</span>
                    <span className="text-[#78716C] text-xs">{formatFileSize(file.size)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile?.(file.id);
                      }}
                      className="p-1 rounded-full hover:bg-warm-200 text-[#78716C] hover:text-[#1C1917]"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

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
export type { AttachedFile };
