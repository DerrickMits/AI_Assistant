"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, ChatSession } from "@/lib/types";

const STORAGE_KEY = "derrick-ai-chats-v1";
const ACTIVE_KEY = "derrick-ai-active-id-v1";

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function deriveTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 38 ? clean.slice(0, 38) + "..." : clean || "New chat";
}

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  } catch {
    return [];
  }
}

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    const savedActive =
      typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_KEY) : null;
    setActiveId(
      savedActive && loaded.some((s) => s.id === savedActive)
        ? savedActive
        : loaded[0]?.id ?? null,
    );
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (!hydratedRef.current || !activeId) return;
    if (typeof window !== "undefined")
      window.localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const newChat = useCallback((): string => {
    const id = uid();
    const session: ChatSession = {
      id,
      title: "New chat",
      messages: [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const selectChat = useCallback((id: string) => setActiveId(id), []);

  const togglePin = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)),
    );
  }, []);

  const updateSession = useCallback(
    (id: string, patch: Partial<ChatSession>) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
        ),
      );
    },
    [],
  );

  const deleteChat = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next;
    });
    setActiveId((cur) => {
      if (cur !== id) return cur;
      // Will be recomputed below; the active picker effect handles null.
      let fallback: string | null = null;
      setSessions((prev) => {
        fallback = prev[0]?.id ?? null;
        return prev;
      });
      return fallback;
    });
  }, []);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  const pinned = useMemo(() => sessions.filter((s) => s.pinned), [sessions]);
  const recents = useMemo(
    () =>
      sessions
        .filter((s) => !s.pinned)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  // When the active chat is deleted, fall back to the first session (or null).
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (activeId && !sessions.some((s) => s.id === activeId)) {
      setActiveId(sessions[0]?.id ?? null);
    }
  }, [sessions, activeId]);

  return {
    sessions,
    pinned,
    recents,
    active,
    activeId,
    newChat,
    selectChat,
    togglePin,
    updateSession,
    deleteChat,
  };
}

export { DEFAULT_MODEL } from "@/lib/site";
export type { ChatMessage, ChatSession };
