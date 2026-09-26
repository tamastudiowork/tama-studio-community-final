"use client";

import { useState } from "react";
import { CATEGORY_GROUPS } from "@/lib/postCategories";

export default function TagPicker({
  selected,
  onChange,
  maxTags,
  minTags = 2,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  maxTags: number;
  minTags?: number;
}) {
  // Grup pertama kebuka default biar orang langsung liat pilihan tanpa klik.
  const [openGroup, setOpenGroup] = useState<string | null>(CATEGORY_GROUPS[0]?.id ?? null);
  const atMax = selected.length >= maxTags;

  function toggle(slug: string) {
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug));
      return;
    }
    if (atMax) return;
    onChange([...selected, slug]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm text-paper-dim">Kategori</label>
        <span className={`font-mono text-xs ${atMax ? "text-amber-soft" : "text-paper-faint"}`}>
          {selected.length}/{maxTags} dipilih
        </span>
      </div>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((slug) => {
            const label =
              CATEGORY_GROUPS.flatMap((g) => g.options).find((o) => o.slug === slug)?.label ?? slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => toggle(slug)}
                className="flex items-center gap-1 rounded-md bg-amber px-2.5 py-1 font-mono text-xs text-ink"
              >
                {label} <span aria-hidden>×</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 space-y-2 rounded-md border border-ink-line bg-ink-soft p-2">
        {CATEGORY_GROUPS.map((group) => {
          const isOpen = openGroup === group.id;
          const countInGroup = group.options.filter((o) => selected.includes(o.slug)).length;
          return (
            <div key={group.id} className="rounded-md">
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.id)}
                className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm text-paper-dim"
              >
                <span>
                  {group.label}
                  {countInGroup > 0 && <span className="ml-1.5 text-xs text-amber-soft">({countInGroup})</span>}
                </span>
                <span className="text-xs text-paper-faint">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                  {group.options.map((opt) => {
                    const isSelected = selected.includes(opt.slug);
                    const disabled = !isSelected && atMax;
                    return (
                      <button
                        key={opt.slug}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(opt.slug)}
                        className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                          isSelected
                            ? "bg-amber text-ink"
                            : disabled
                            ? "cursor-not-allowed bg-ink-surface text-paper-faint/40"
                            : "bg-ink-surface text-paper-faint hover:text-paper"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-1.5 text-xs text-paper-faint">
        Pilih minimal {minTags} kategori, maksimal {maxTags} (batas ini bisa dikecilkan admin saat trafik ramai).
      </p>
    </div>
  );
}
