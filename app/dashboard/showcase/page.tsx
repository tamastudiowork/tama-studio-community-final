"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShowcaseService, type ShowcaseItem } from "@/lib/showcase";

export default function ShowcasePage() {
  const [items, setItems] = useState<ShowcaseItem[] | null>(null);

  useEffect(() => {
    ShowcaseService.listAll().then(setItems);
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Showcase</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
            Pamer Karya
          </h1>
          <p className="mt-1 text-sm text-paper-dim">Proyek yang dibanggakan anggota komunitas.</p>
        </div>
        <Link
          href="/dashboard/showcase/baru"
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
        >
          + Pamerkan karya
        </Link>
      </div>

      <div className="mt-8">
        {items === null ? (
          <p className="font-mono text-sm text-paper-faint">Memuat...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
            <p className="text-sm text-paper-dim">Belum ada yang pamer karya. Jadi yang pertama.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/showcase/${item.id}`}
                className="group overflow-hidden rounded-card border border-ink-line bg-ink-soft transition-colors hover:border-paper-dim"
              >
                <div className="flex aspect-video items-center justify-center bg-ink-surface">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-mono text-3xl text-paper-faint">◫</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate font-display text-sm font-semibold text-paper group-hover:text-amber-soft">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-paper-faint">{item.authorName}</p>
                  <p className="mt-2 font-mono text-xs text-paper-faint">♥ {item.likesCount}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
