"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { ShowcaseService, type ShowcaseItem } from "@/lib/showcase";
import ReportButton from "@/components/ReportButton";

export default function ShowcaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<ShowcaseItem | null | undefined>(undefined);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const unsub = ShowcaseService.subscribe(id, setItem);
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!user) return;
    ShowcaseService.isLikedByMe(id, user.uid).then(setLiked);
  }, [id, user]);

  async function handleToggleLike() {
    if (!user) return;
    setLiked(await ShowcaseService.toggleLike(id, user.uid));
  }

  async function handleDelete() {
    if (!confirm("Hapus karya ini?")) return;
    await ShowcaseService.remove(id);
    router.push("/dashboard/showcase");
  }

  if (item === undefined) {
    return <p className="p-8 font-mono text-sm text-paper-faint">Memuat...</p>;
  }
  if (item === null) {
    return <p className="p-8 text-sm text-paper-dim">Karya tidak ditemukan.</p>;
  }

  const isOwner = user?.uid === item.authorId;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/showcase" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Showcase
      </Link>

      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="mt-4 w-full rounded-card border border-ink-line object-cover" />
      )}

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-paper sm:text-3xl">{item.title}</h1>
          <p className="mt-1 text-sm text-paper-faint">oleh {item.authorName}</p>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="shrink-0 rounded-md border border-[#F45D5D]/40 px-3 py-1.5 text-xs text-[#F45D5D]"
          >
            Hapus
          </button>
        )}
      </div>

      {item.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-paper-dim">{item.description}</p>}

      {item.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-ink-surface px-2 py-0.5 font-mono text-[11px] text-paper-faint">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {item.repoId && (
        <Link
          href={`/dashboard/kode/${item.repoId}`}
          className="mt-4 inline-block rounded-md border border-ink-line px-3 py-1.5 text-xs text-paper-dim hover:border-paper-dim"
        >
          {"{}"} Lihat repo terkait
        </Link>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleToggleLike}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            liked ? "border-amber bg-amber/10 text-amber-soft" : "border-ink-line text-paper-dim"
          }`}
        >
          {liked ? "♥ Disukai" : "♡ Suka"} · {item.likesCount}
        </button>
        {!isOwner && (
          <ReportButton
            targetType="showcase"
            targetId={item.id}
            targetLabel={item.title}
            targetHref={`/dashboard/showcase/${item.id}`}
          />
        )}
      </div>
    </div>
  );
}
