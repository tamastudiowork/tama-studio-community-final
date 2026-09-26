"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { ClipService, type Clip } from "@/lib/clips";
import ReportButton from "@/components/ReportButton";

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

function ClipCard({ clip }: { clip: Clip }) {
  const { user } = useAuth();
  const [upvoted, setUpvoted] = useState(false);
  const [count, setCount] = useState(clip.upvotesCount);

  useEffect(() => {
    if (!user) return;
    ClipService.isUpvotedByMe(clip.id, user.uid).then(setUpvoted);
  }, [clip.id, user]);

  async function handleUpvote() {
    if (!user) return;
    const now = await ClipService.toggleUpvote(clip.id, user.uid);
    setUpvoted(now);
    setCount((c) => c + (now ? 1 : -1));
  }

  async function handleDelete() {
    if (!confirm("Hapus klip ini?")) return;
    await ClipService.remove(clip.id);
  }

  const isOwner = user?.uid === clip.authorId;

  return (
    <div className="rounded-card border border-ink-line bg-ink-soft p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-ink-surface text-xs font-semibold text-amber-soft">
            {clip.authorPhotoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clip.authorPhotoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              clip.authorName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm text-paper">{clip.authorName}</p>
            <p className="text-[11px] text-paper-faint">{timeAgo(clip.createdAt)}</p>
          </div>
        </div>
        <span className="rounded-full border border-ink-line px-2 py-0.5 font-mono text-[10px] text-paper-faint">
          {clip.language}
        </span>
      </div>

      {clip.caption && <p className="mt-3 text-sm text-paper-dim">{clip.caption}</p>}

      <pre className="mt-3 overflow-x-auto rounded-md border border-ink-line bg-ink px-3 py-2.5">
        <code className="font-mono text-xs text-paper">{clip.code}</code>
      </pre>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleUpvote}
          className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
            upvoted ? "border-amber bg-amber/10 text-amber-soft" : "border-ink-line text-paper-dim"
          }`}
        >
          ▲ {count}
        </button>
        {isOwner ? (
          <button onClick={handleDelete} className="text-xs text-paper-faint hover:text-[#F45D5D]">
            Hapus
          </button>
        ) : (
          <ReportButton
            targetType="clip"
            targetId={clip.id}
            targetLabel={`Klip dari ${clip.authorName}`}
            targetHref="/dashboard/klip"
          />
        )}
      </div>
    </div>
  );
}

export default function KlipPage() {
  const [clips, setClips] = useState<Clip[]>([]);

  useEffect(() => {
    const unsub = ClipService.subscribeFeed(setClips);
    return unsub;
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Tama Clips</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
            Klip Kode
          </h1>
          <p className="mt-1 text-sm text-paper-dim">Potongan kode singkat, tip, atau trik — bagikan cepat.</p>
        </div>
        <Link
          href="/dashboard/klip/baru"
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
        >
          + Bagikan klip
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
            <p className="text-sm text-paper-dim">Belum ada klip. Bagikan yang pertama.</p>
          </div>
        ) : (
          clips.map((clip) => <ClipCard key={clip.id} clip={clip} />)
        )}
      </div>
    </div>
  );
}
