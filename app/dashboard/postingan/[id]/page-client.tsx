"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { PostService, type Post, type PostComment, type VoteValue } from "@/lib/posts";
import { categoryLabel } from "@/lib/postCategories";
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

function CommentBlock({
  comment,
  replies,
  onReply,
}: {
  comment: PostComment;
  replies: PostComment[];
  onReply: (parentId: string, text: string) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  function submitReply() {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText("");
    setReplying(false);
  }

  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-surface text-xs font-semibold text-amber-soft">
          {comment.userPhotoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comment.userPhotoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            comment.userName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Link href={`/dashboard/u/${comment.userId}`} className="font-medium text-paper hover:text-amber-soft">
              {comment.userName}
            </Link>{" "}
            <span className="text-xs text-paper-faint">{timeAgo(comment.createdAt)}</span>
          </p>
          <p className="mt-0.5 text-sm text-paper-dim">{comment.text}</p>
          <button onClick={() => setReplying((v) => !v)} className="mt-1 text-xs text-paper-faint hover:text-paper">
            Balas
          </button>

          {replying && (
            <div className="mt-2 flex gap-2">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
                placeholder="Tulis balasan..."
                className="flex-1 rounded-md border border-ink-line bg-ink-soft px-3 py-1.5 text-sm text-paper outline-none focus:border-amber"
              />
              <button onClick={submitReply} className="rounded-md bg-amber px-3 py-1.5 text-xs font-semibold text-ink">
                Kirim
              </button>
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 border-l border-ink-line pl-4">
          {replies.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-surface text-[10px] font-semibold text-amber-soft">
                {r.userPhotoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.userPhotoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  r.userName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-medium text-paper">{r.userName}</span>{" "}
                  <span className="text-xs text-paper-faint">{timeAgo(r.createdAt)}</span>
                </p>
                <p className="mt-0.5 text-sm text-paper-dim">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [myVote, setMyVote] = useState<VoteValue | 0>(0);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = PostService.subscribe(id, setPost);
    return unsub;
  }, [id]);

  useEffect(() => {
    const unsub = PostService.subscribeComments(id, setComments);
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!user) return;
    PostService.myVote(id, user.uid).then(setMyVote);
  }, [id, user]);

  const topLevel = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
  const repliesFor = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  async function handleVote(value: VoteValue) {
    if (!user) return;
    setMyVote(await PostService.vote(id, user.uid, value));
  }

  async function handleDelete() {
    if (!confirm("Hapus postingan ini?")) return;
    await PostService.remove(id);
    router.push("/dashboard/postingan");
  }

  async function handleSendComment(e: FormEvent) {
    e.preventDefault();
    if (!user || !commentText.trim()) return;
    setSending(true);
    try {
      await PostService.addComment(
        id,
        { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
        commentText
      );
      setCommentText("");
    } finally {
      setSending(false);
    }
  }

  async function handleReply(parentId: string, text: string) {
    if (!user) return;
    await PostService.addComment(
      id,
      { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
      text,
      parentId
    );
  }

  if (post === undefined) return <p className="p-8 font-mono text-sm text-paper-faint">Memuat...</p>;
  if (post === null) return <p className="p-8 text-sm text-paper-dim">Postingan tidak ditemukan.</p>;

  const isOwner = user?.uid === post.authorId;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/postingan" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Postingan
      </Link>

      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" className="mt-4 w-full rounded-card border border-ink-line object-cover" />
      )}

      <div className="mt-5 flex items-start gap-4">
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 rounded-md border border-ink-line py-2">
          <button
            onClick={() => handleVote(1)}
            className={`text-sm ${myVote === 1 ? "text-amber" : "text-paper-faint hover:text-paper"}`}
          >
            ▲
          </button>
          <span className="font-mono text-xs text-paper">{post.score}</span>
          <button
            onClick={() => handleVote(-1)}
            className={`text-sm ${myVote === -1 ? "text-[#F45D5D]" : "text-paper-faint hover:text-paper"}`}
          >
            ▼
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-semibold text-paper sm:text-3xl">{post.title}</h1>
            {isOwner && (
              <button
                onClick={handleDelete}
                className="shrink-0 rounded-md border border-[#F45D5D]/40 px-3 py-1.5 text-xs text-[#F45D5D]"
              >
                Hapus
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-paper-faint">
            <Link href={`/dashboard/u/${post.authorId}`} className="hover:text-paper">
              {post.authorName}
            </Link>{" "}
            · {timeAgo(post.createdAt)}
          </p>

          {post.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-paper-dim">{post.description}</p>
          )}

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-md border border-ink-line px-3 py-1.5 text-xs text-amber-soft hover:border-amber"
            >
              Buka link →
            </a>
          )}

          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-ink-surface px-2 py-0.5 font-mono text-[11px] text-paper-faint">
                  {categoryLabel(tag)}
                </span>
              ))}
            </div>
          )}

          {!isOwner && (
            <div className="mt-3">
              <ReportButton
                targetType="post"
                targetId={post.id}
                targetLabel={post.title}
                targetHref={`/dashboard/postingan/${post.id}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-10">
        <p className="font-display text-lg font-semibold text-paper">Diskusi ({comments.length})</p>

        <div className="mt-4 space-y-5">
          {topLevel.map((c) => (
            <CommentBlock key={c.id} comment={c} replies={repliesFor(c.id)} onReply={handleReply} />
          ))}
        </div>

        <form onSubmit={handleSendComment} className="mt-5 flex gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Tulis komentar..."
            className="flex-1 rounded-md border border-ink-line bg-ink-soft px-3.5 py-2 text-sm text-paper outline-none focus:border-amber"
          />
          <button
            type="submit"
            disabled={sending || !commentText.trim()}
            className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}
