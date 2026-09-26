"use client";

import type { Chapter } from "@/lib/books";

export default function ChapterList({
  chapters,
  activeId,
  completedIds,
  isOwner,
  onSelect,
  onAdd,
  onMove,
  onDelete,
}: {
  chapters: Chapter[];
  activeId: string | null;
  completedIds: string[];
  isOwner: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onDelete: (id: string) => void;
}) {
  const doneCount = chapters.filter((c) => completedIds.includes(c.id)).length;
  const pct = chapters.length ? Math.round((doneCount / chapters.length) * 100) : 0;

  return (
    <aside className="w-64 shrink-0 border-r border-ink-line bg-ink-soft/40 px-3 py-5">
      {!isOwner && chapters.length > 0 && (
        <div className="mb-4 px-2">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-paper-faint">
            <span>Progres</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-surface">
            <div className="h-full bg-mint transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {chapters.map((ch, i) => {
          const active = ch.id === activeId;
          const done = completedIds.includes(ch.id);
          return (
            <div
              key={ch.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                active ? "bg-ink-surface text-paper" : "text-paper-dim hover:bg-ink-surface/60"
              }`}
            >
              <button onClick={() => onSelect(ch.id)} className="flex flex-1 items-center gap-2 text-left">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                    done ? "border-mint bg-mint text-ink" : "border-ink-line text-paper-faint"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className="truncate">{ch.title}</span>
              </button>

              {isOwner && (
                <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                  <button
                    onClick={() => onMove(ch.id, "up")}
                    className="rounded px-1 text-paper-faint hover:text-paper"
                    title="Naikkan"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => onMove(ch.id, "down")}
                    className="rounded px-1 text-paper-faint hover:text-paper"
                    title="Turunkan"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => onDelete(ch.id)}
                    className="rounded px-1 text-paper-faint hover:text-[#F45D5D]"
                    title="Hapus bab"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isOwner && (
        <button
          onClick={onAdd}
          className="mt-3 w-full rounded-md border border-dashed border-ink-line px-2 py-2 text-xs text-paper-faint hover:border-paper-dim hover:text-paper"
        >
          + Tambah bab
        </button>
      )}
    </aside>
  );
}
