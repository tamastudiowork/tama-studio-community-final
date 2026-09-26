"use client";

import { useState } from "react";
import type { Channel, ChannelType } from "@/lib/groups";

export default function ChannelList({
  channels,
  activeId,
  canManage,
  onSelect,
  onAdd,
  onDelete,
}: {
  channels: Channel[];
  activeId: string | null;
  canManage: boolean;
  onSelect: (id: string) => void;
  onAdd: (name: string, type: ChannelType) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState<ChannelType | null>(null);
  const [name, setName] = useState("");

  function submitAdd() {
    if (name.trim() && adding) onAdd(name.trim(), adding);
    setName("");
    setAdding(null);
  }

  const textChannels = channels.filter((c) => c.type !== "voice");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  function renderChannel(ch: Channel, icon: string) {
    return (
      <div
        key={ch.id}
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
          ch.id === activeId ? "bg-ink-surface text-paper" : "text-paper-dim hover:bg-ink-surface/60"
        }`}
      >
        <button onClick={() => onSelect(ch.id)} className="flex-1 truncate text-left">
          {icon} {ch.name}
        </button>
        {canManage && channels.length > 1 && (
          <button
            onClick={() => onDelete(ch.id)}
            className="hidden text-paper-faint hover:text-[#F45D5D] group-hover:block"
            title="Hapus channel"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="px-2 font-mono text-[11px] uppercase tracking-wide text-paper-faint">Teks</p>
      <div className="mt-1.5 space-y-0.5">{textChannels.map((ch) => renderChannel(ch, "#"))}</div>
      {canManage &&
        (adding === "text" ? (
          <div className="mt-1.5 px-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
              onBlur={submitAdd}
              placeholder="nama-channel"
              className="w-full rounded-md border border-ink-line bg-ink px-2 py-1 text-xs text-paper outline-none focus:border-amber"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding("text")}
            className="mt-1.5 w-full rounded-md px-2 py-1.5 text-left text-xs text-paper-faint hover:text-paper"
          >
            + Tambah channel teks
          </button>
        ))}

      <p className="mt-4 px-2 font-mono text-[11px] uppercase tracking-wide text-paper-faint">Suara</p>
      <div className="mt-1.5 space-y-0.5">{voiceChannels.map((ch) => renderChannel(ch, "🔊"))}</div>
      {canManage &&
        (adding === "voice" ? (
          <div className="mt-1.5 px-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
              onBlur={submitAdd}
              placeholder="nama-channel-suara"
              className="w-full rounded-md border border-ink-line bg-ink px-2 py-1 text-xs text-paper outline-none focus:border-amber"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding("voice")}
            className="mt-1.5 w-full rounded-md px-2 py-1.5 text-left text-xs text-paper-faint hover:text-paper"
          >
            + Tambah channel suara
          </button>
        ))}
    </div>
  );
}
