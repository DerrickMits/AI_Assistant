"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import { useChatStore } from "@/hooks/useChat";
import { DEFAULT_MODEL } from "@/lib/site";
import { uid, deriveTitle, type ChatMessage } from "@/hooks/useChat";
import { AIChatInput, AttachedFile } from "@/components/ai-chat-input";

export default function ChatShell() {
  const store = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  const activeMessages: ChatMessage[] = store.active?.messages ?? [];

  const ai = useChat({
    api: "/api/chat",
    id: store.activeId ?? "default",
    streamProtocol: "text",
    body: { model: DEFAULT_MODEL },
    initialMessages: activeMessages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
    onFinish: (m) => {
      if (!store.activeId) return;
      const existing = store.active?.messages ?? [];
      // Save assistant turn into the persistent store for this session.
      store.updateSession(store.activeId, {
        messages: [...existing, { id: m.id, role: "assistant" as const, content: m.content, createdAt: Date.now() as unknown as number }],
        title: existing.some((x) => x.role === "user") ? deriveTitle(existing.find((x) => x.role === "user")?.content ?? existing[0]?.content ?? "New chat") : "New chat",
      });
    },
  });

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update input with interim results for real-time feedback
      if (interimTranscript) {
        setInput((prev) => {
          // Replace the last interim result or append
          const lastSpaceIndex = prev.lastIndexOf(" ");
          const baseText = lastSpaceIndex > 0 ? prev.slice(0, lastSpaceIndex + 1) : "";
          return baseText + interimTranscript;
        });
      }
      
      // When final, add to input permanently
      if (finalTranscript) {
        setInput((prev) => prev + (prev ? " " : "") + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        alert("Microphone access denied. Please allow microphone access in your browser settings.");
      }
      setIsRecording(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        // Restart if we're still supposed to be listening
        try {
          recognition.start();
        } catch (e) {
          // Already started or other error
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle file attachment
  const handleAttachFile = useCallback((file: AttachedFile) => {
    setAttachedFiles((prev) => [...prev, file]);
  }, []);

  // Handle file removal
  const handleRemoveFile = useCallback((id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Toggle voice recording using Web Speech API
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current && isListeningRef.current) {
        isListeningRef.current = false;
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    // Start recording
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recognition:", error);
      alert("Could not start voice recognition. Please try again.");
      isListeningRef.current = false;
    }
  }, [isRecording]);

  // Keep session store in sync with each user message (so sidebar title + history persist).
  const persistUserAndSend = useCallback(() => {
    if (!input.trim() && attachedFiles.length === 0 || ai.status === "streaming" || ai.status === "submitted") return;
    
    const content = input.trim();
    const timestamp = Date.now();
    
    // Create user message with file attachments metadata
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: content + (attachedFiles.length > 0 ? `\n\n[Attached ${attachedFiles.length} file(s): ${attachedFiles.map(f => f.name).join(", ")}]` : ""),
      createdAt: timestamp as unknown as number,
    };
    
    // Ensure we have an active session.
    let activeId = store.activeId;
    if (!activeId) {
      activeId = store.newChat();
    }
    if (activeId) {
      const existing = store.active?.messages ?? [];
      store.updateSession(activeId, {
        messages: [...existing, userMsg],
        title: existing.length === 0 ? deriveTitle(content) : store.active?.title ?? "New chat",
      });
    }
    
    // Hand to the AI SDK with the *just-appended* message sequence.
    // Include file attachments in the message content for the AI to reference
    const messageContent = content + (attachedFiles.length > 0 ? `\n\n[Attached files: ${attachedFiles.map(f => `${f.name} (${f.type}, ${f.base64.slice(0, 50)}...)`).join("; ")}]` : "");
    
    ai.append({
      role: "user",
      content: messageContent,
    });
    
    // Clear input and attachments
    setInput("");
    setAttachedFiles([]);
  }, [input, attachedFiles, ai, store]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        pinned={store.pinned}
        recents={store.recents}
        activeId={store.activeId}
        onNewChat={() => { store.newChat(); }}
        onSelect={store.selectChat}
        onTogglePin={store.togglePin}
        onDelete={store.deleteChat}
      />
      <ChatArea
        messages={ai.messages}
        isStreaming={ai.isLoading || ai.status === "submitted"}
        inputValue={input}
        onChangeInput={setInput}
        onSubmit={persistUserAndSend}
        onStop={ai.stop}
        onOpenSidebar={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
        attachedFiles={attachedFiles}
        onAttachFile={handleAttachFile}
        onRemoveFile={handleRemoveFile}
        onVoiceTranscription={() => {}}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
      />
    </div>
  );
}
