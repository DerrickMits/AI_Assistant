"use client";

import {
  PanelLeftClose,
  SquarePen,
  Pin,
  PinOff,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  pinned: { id: string; title: string }[];
  recents: { id: string; title: string; updatedAt: number }[];
  activeId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({
  open, onToggle, pinned, recents, activeId, onNewChat, onSelect, onTogglePin, onDelete,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "shrink-0 h-full bg-[#0f0f11] border-r border-[#1c1c20] flex flex-col transition-[width] duration-300 ease-out overflow-hidden",
        open ? "w-[280px]" : "w-0",
      )}
    >
      <div className="w-[280px] h-full flex flex-col">
        {/* ---------- Top bar ---------- */}
        <div className="flex items-center px-3 h-14 shrink-0">
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="w-9 h-9 grid place-items-center rounded-full text-[#c9c9d1] hover:bg-white/5 transition-colors"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* ---------- Primary actions ---------- */}
        <div className="px-3 pb-2 space-y-1">
          <button
            onClick={onNewChat}
            className="flex items-center gap-3 w-full h-12 pl-3 pr-3 rounded-2xl text-[14px] text-[#e8e8ee] hover:bg-white/5 transition-colors"
          >
            <SquarePen className="w-5 h-5 text-[#c9c9d1]" />
            <span className="font-medium">New chat</span>
          </button>
        </div>

        {/* ---------- Scrollable sections ---------- */}
        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2">
          {/* Pinned chats */}
          {pinned.length > 0 && (
            <Section label="Pinned">
              {pinned.map((c) => (
                <ChatRow
                  key={c.id}
                  title={c.title}
                  active={activeId === c.id}
                  pinned
                  onSelect={() => onSelect(c.id)}
                  onTogglePin={() => onTogglePin(c.id)}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </Section>
          )}

          {/* Recents */}
          <Section label="Recents">
            {recents.length === 0 ? (
              <div className="px-2 py-2 text-[12px] text-[#6f6f78]">
                No conversations yet. Start with a new chat.
              </div>
            ) : (
              recents.map((c) => (
                <ChatRow
                  key={c.id}
                  title={c.title}
                  active={activeId === c.id}
                  pinned={false}
                  onSelect={() => onSelect(c.id)}
                  onTogglePin={() => onTogglePin(c.id)}
                  onDelete={() => onDelete(c.id)}
                />
              ))
            )}
          </Section>
        </div>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-[#6f6f78]">{label}</h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ChatRow({
  title, active, pinned, onSelect, onTogglePin, onDelete,
}: {
  title: string;
  active: boolean;
  pinned: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 w-full h-9 pl-2 pr-1 rounded-xl text-[13px] transition-colors cursor-pointer",
        active ? "bg-[#1f3a5f]/25 text-[#e8e8ee]" : "text-[#c9c9d1] hover:bg-white/5",
      )}
      onClick={onSelect}
    >
      <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
      <span className="truncate flex-1">{title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        aria-label={pinned ? "Unpin chat" : "Pin chat"}
        className="opacity-0 group-hover:opacity-100 w-7 h-7 grid place-items-center rounded-lg hover:bg-white/10 transition-opacity"
      >
        {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete chat"
        className="opacity-0 group-hover:opacity-100 w-7 h-7 grid place-items-center rounded-lg text-[#d77] hover:bg-white/10 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
