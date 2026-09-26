"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { PostService, type Post, type VoteValue } from "@/lib/posts";
import { FollowService } from "@/lib/follows";
import { CATEGORY_GROUPS, categoryLabel } from "@/lib/postCategories";

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

function VoteWidget({ post }: { post: Post }) {
  const { user } = useAuth();
  const [myVote, setMyVote] = useState<VoteValue | 0>(0);
  const [score, setScore] = useState(post.score);

  useEffect(() => {
    if (!user) return;
    PostService.myVote(post.id, user.uid).then(setMyVote);
  }, [post.id, user]);

  async function handleVote(e: MouseEvent, value: VoteValue) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const before = myVote;
    const next = await PostService.vote(post.id, user.uid, value);
    setMyVote(next);
    setScore((s) => s - before + next);
  }

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-md border border-ink-line py-1.5">
      <button
        onClick={(e) => handleVote(e, 1)}
        className={`text-xs ${myVote === 1 ? "text-amber" : "text-paper-faint hover:text-paper"}`}
      >
        ▲
      </button>
      <span className="font-mono text-xs text-paper">{score}</span>
      <button
        onClick={(e) => handleVote(e, -1)}
        className={`text-xs ${myVote === -1 ? "text-[#F45D5D]" : "text-paper-faint hover:text-paper"}`}
      >
        ▼
      </button>
    </div>
  );
}

export default function PostinganPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [sort, setSort] = useState<"terbaru" | "terpopuler" | "mengikuti">("terbaru");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[] | null>(null);

  useEffect(() => {
    PostService.listAll().then(setPosts);
  }, []);

  useEffect(() => {
    if (!user) return;
    FollowService.listFollowing(user.uid).then(setFollowingIds);
  }, [user]);

  // Cuma tampilkan chip filter untuk kategori yang benar-benar dipakai di
  // salah satu postingan yang ada, dikelompokkan sesuai taxonomy resmi
  // (bukan tag bebas lagi) supaya urutannya konsisten & tidak melompat-lompat
  // tiap kali ada postingan baru.
  const groupsWithUsedTags = useMemo(() => {
    const used = new Set<string>();
    (posts || []).forEach((p) => p.tags.forEach((t) => used.add(t)));
    return CATEGORY_GROUPS.map((g) => ({
      ...g,
      options: g.options.filter((o) => used.has(o.slug)),
    })).filter((g) => g.options.length > 0);
  }, [posts]);

  const filtered = useMemo(() => {
    if (!posts) return null;
    let list = posts;
    if (activeTag) list = list.filter((p) => p.tags.includes(activeTag));
    if (sort === "mengikuti") {
      const ids = new Set(followingIds || []);
      list = list.filter((p) => ids.has(p.authorId));
    }
    return [...list].sort((a, b) => (sort === "terpopuler" ? b.score - a.score : b.createdAt - a.createdAt));
  }, [posts, sort, activeTag, followingIds]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Postingan</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
            Temuan & Diskusi Komunitas
          </h1>
          <p className="mt-1 text-sm text-paper-dim">
            Tools, produk, curhat, ajakan kolaborasi — apa pun yang layak dibagikan.
          </p>
        </div>
        <Link
          href="/dashboard/postingan/baru"
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
        >
          + Posting
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-ink-line bg-ink-soft p-1">
          <button
            onClick={() => setSort("terbaru")}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              sort === "terbaru" ? "bg-ink-surface text-paper" : "text-paper-dim"
            }`}
          >
            Terbaru
          </button>
          <button
            onClick={() => setSort("terpopuler")}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              sort === "terpopuler" ? "bg-ink-surface text-paper" : "text-paper-dim"
            }`}
          >
            Terpopuler
          </button>
          <button
            onClick={() => setSort("mengikuti")}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              sort === "mengikuti" ? "bg-ink-surface text-paper" : "text-paper-dim"
            }`}
          >
            Mengikuti
          </button>
        </div>

      </div>

      {groupsWithUsedTags.length > 0 && (
        <div className="mt-3 space-y-2">
          {groupsWithUsedTags.map((group) => (
            <div key={group.id} className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wide text-paper-faint">
                {group.label}
              </span>
              {group.options.map((opt) => (
                <button
                  key={opt.slug}
                  onClick={() => setActiveTag((t) => (t === opt.slug ? null : opt.slug))}
                  className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                    activeTag === opt.slug ? "bg-amber text-ink" : "bg-ink-soft text-paper-faint hover:text-paper"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {filtered === null ? (
          <p className="font-mono text-sm text-paper-faint">Memuat...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
            <p className="text-sm text-paper-dim">
              {sort === "mengikuti"
                ? "Belum ada postingan dari orang yang kamu ikuti."
                : "Belum ada postingan. Jadi yang pertama."}
            </p>
          </div>
        ) : (
          filtered.map((post) => (
            <Link
              key={post.id}
              href={`/dashboard/postingan/${post.id}`}
              className="flex gap-3 rounded-card border border-ink-line bg-ink-soft p-4 transition-colors hover:border-paper-dim"
            >
              <VoteWidget post={post} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold text-paper">{post.title}</p>
                {post.description && <p className="mt-1 line-clamp-2 text-sm text-paper-dim">{post.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-ink-surface px-2 py-0.5 font-mono text-[11px] text-paper-faint">
                      {categoryLabel(tag)}
                    </span>
                  ))}
                </div>
                <p className="mt-2 font-mono text-xs text-paper-faint">
                  {post.authorName} · {timeAgo(post.createdAt)} · 💬 {post.commentsCount}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
