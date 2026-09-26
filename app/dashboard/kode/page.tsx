"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { RepoService, type Repo } from "@/lib/repos";

type Tab = "mine" | "public";

function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Link
      href={`/dashboard/kode/${repo.id}`}
      className="flex flex-col rounded-card border border-ink-line bg-ink-soft p-5 transition-colors hover:border-paper-dim"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-mono text-sm text-paper">
          <span className="text-paper-faint">{repo.ownerName}</span>
          <span className="text-paper-faint"> / </span>
          <span className="font-semibold text-paper">{repo.name}</span>
        </p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            repo.visibility === "private"
              ? "border-amber-dim text-amber-soft"
              : "border-mint-dim text-mint"
          }`}
        >
          {repo.visibility === "private" ? "Privat" : "Publik"}
        </span>
      </div>

      {repo.description && (
        <p className="mt-2 line-clamp-2 text-sm text-paper-dim">{repo.description}</p>
      )}

      {repo.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {repo.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-ink-surface px-2 py-0.5 font-mono text-[11px] text-paper-faint"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 font-mono text-xs text-paper-faint">
        <span>★ {repo.starsCount}</span>
        <span>⑂ {repo.forksCount}</span>
        <span>◉ {repo.viewsCount}</span>
      </div>
    </Link>
  );
}

export default function KodeBrowserPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("mine");
  const [myRepos, setMyRepos] = useState<Repo[] | null>(null);
  const [publicRepos, setPublicRepos] = useState<Repo[] | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    RepoService.listMine(user.uid).then(setMyRepos);
  }, [user]);

  useEffect(() => {
    if (tab === "public" && publicRepos === null) {
      RepoService.listPublic().then(setPublicRepos);
    }
  }, [tab, publicRepos]);

  const list = tab === "mine" ? myRepos : publicRepos;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (list || []).forEach((r) => r.tags.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 12);
  }, [list]);

  const filtered = useMemo(() => {
    if (!list) return null;
    return list.filter((r) => {
      const matchesSearch =
        !search.trim() ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !activeTag || r.tags.includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [list, search, activeTag]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Kode</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
            Repo
          </h1>
        </div>
        <Link
          href="/dashboard/kode/baru"
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
        >
          + Repo baru
        </Link>
      </div>

      <div className="mt-6 flex gap-1 rounded-md border border-ink-line bg-ink-soft p-1 w-fit">
        <button
          onClick={() => setTab("mine")}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "mine" ? "bg-ink-surface text-paper" : "text-paper-dim"
          }`}
        >
          Proyek Saya
        </button>
        <button
          onClick={() => setTab("public")}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "public" ? "bg-ink-surface text-paper" : "text-paper-dim"
          }`}
        >
          Jelajahi
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari repo..."
          className="w-full max-w-xs rounded-md border border-ink-line bg-ink-soft px-3.5 py-2 text-sm text-paper outline-none focus:border-amber"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag((t) => (t === tag ? null : tag))}
                className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                  activeTag === tag
                    ? "bg-amber text-ink"
                    : "bg-ink-soft text-paper-faint hover:text-paper"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        {filtered === null ? (
          <p className="font-mono text-sm text-paper-faint">Memuat...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
            <p className="text-sm text-paper-dim">
              {tab === "mine"
                ? "Belum ada repo. Bikin yang pertama."
                : "Belum ada repo publik yang cocok."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
