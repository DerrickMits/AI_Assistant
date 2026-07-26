"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import { useChatStore } from "@/hooks/useChat";
import { DEFAULT_MODEL } from "@/lib/site";
import { uid, deriveTitle, type ChatMessage } from "@/hooks/useChat";

export default function ChatShell() {
  const store = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");

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

  // Keep session store in sync with each user message (so sidebar title + history persist).
  const persistUserAndSend = () => {
    if (!input.trim() || ai.status === "streaming" || ai.status === "submitted") return;
    const content = input.trim();
    const timestamp = Date.now();
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content,
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
    ai.append({
      role: "user",
      content,
    });
    setInput("");
  };

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
      />
    </div>
  );
}
