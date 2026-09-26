"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { BookService, type Book, type Chapter, type Progress } from "@/lib/books";
import { renderMarkdown } from "@/lib/markdown";
import ChapterList from "./_components/ChapterList";
import QuizBlock from "./_components/QuizBlock";
import QuizEditor from "./_components/QuizEditor";
import { AiService } from "@/lib/ai";
import ReportButton from "@/components/ReportButton";
import CollaboratorPanel from "./_components/CollaboratorPanel";
import { downloadCompletionCertificate } from "@/lib/certificate";

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const bookId = params.id;
  const { user } = useAuth();

  const [book, setBook] = useState<Book | null | undefined>(undefined);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<Progress>({ completedChapterIds: [], quizScores: {}, updatedAt: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftQuiz, setDraftQuiz] = useState<Chapter["quiz"]>([]);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<"tulis" | "pratinjau">("tulis");
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleAiReview() {
    setAiLoading(true);
    setAiError(null);
    setAiFeedback(null);
    try {
      const feedback = await AiService.reviewContent(draftContent, "book-chapter");
      setAiFeedback(feedback);
    } catch (err: any) {
      setAiError(err?.message || "Gagal minta review AI. Coba lagi.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    const unsub = BookService.subscribe(bookId, setBook);
    return unsub;
  }, [bookId]);

  useEffect(() => {
    const unsub = BookService.subscribeChapters(bookId, (list) => {
      setChapters(list);
      setActiveId((current) => current ?? list[0]?.id ?? null);
    });
    return unsub;
  }, [bookId]);

  useEffect(() => {
    if (!user) return;
    const unsub = BookService.subscribeProgress(bookId, user.uid, setProgress);
    return unsub;
  }, [bookId, user]);

  const isOwner = Boolean(user && book && user.uid === book.ownerId);
  const isEditor = Boolean(user && book && BookService.isEditor(book, user.uid));
  const [collabPanelOpen, setCollabPanelOpen] = useState(false);
  const activeChapter = useMemo(() => chapters.find((c) => c.id === activeId) ?? null, [chapters, activeId]);

  useEffect(() => {
    setEditMode(false);
    setEditorTab("tulis");
    setAiFeedback(null);
    setAiError(null);
    if (activeChapter) {
      setDraftTitle(activeChapter.title);
      setDraftContent(activeChapter.content);
      setDraftQuiz(activeChapter.quiz);
    }
  }, [activeChapter?.id]);

  async function handleSelectChapter(id: string) {
    setActiveId(id);
  }

  async function handleAddChapter() {
    const maxOrder = chapters.length ? Math.max(...chapters.map((c) => c.order)) : -1;
    const newId = await BookService.addChapter(bookId, maxOrder);
    setActiveId(newId);
  }

  async function handleMoveChapter(id: string, direction: "up" | "down") {
    await BookService.moveChapter(bookId, chapters, id, direction);
  }

  async function handleDeleteChapter(id: string) {
    if (chapters.length <= 1) return;
    await BookService.deleteChapter(bookId, id);
    if (activeId === id) setActiveId(null);
  }

  async function handleSaveChapter() {
    if (!activeChapter) return;
    setSaving(true);
    try {
      await BookService.updateChapter(bookId, activeChapter.id, {
        title: draftTitle.trim() || "Tanpa judul",
        content: draftContent,
        quiz: draftQuiz,
      });
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisibility() {
    if (!book || !isOwner) return;
    await BookService.updateMeta(bookId, {
      visibility: book.visibility === "private" ? "public" : "private",
    });
  }

  async function handleToggleComplete() {
    if (!user || !activeChapter) return;
    await BookService.toggleChapterComplete(bookId, user.uid, activeChapter.id);
  }

  async function handleQuizSubmit(scoreFraction: number) {
    if (!user || !activeChapter) return;
    await BookService.recordQuizScore(bookId, user.uid, activeChapter.id, scoreFraction);
  }

  if (book === undefined) {
    return <p className="p-8 font-mono text-sm text-paper-faint">Memuat buku...</p>;
  }
  if (book === null) {
    return <p className="p-8 text-sm text-paper-dim">Buku tidak ditemukan.</p>;
  }

  const isDone = activeChapter ? progress.completedChapterIds.includes(activeChapter.id) : false;
  const allChaptersDone =
    chapters.length > 0 && chapters.every((c) => progress.completedChapterIds.includes(c.id));

  function handleDownloadCertificate() {
    if (!user) return;
    downloadCompletionCertificate({
      bookTitle: book!.title,
      authorName: book!.ownerName,
      readerName: user.displayName || user.email || "Pembaca",
      completedDate: new Date(),
    });
  }

  return (
    <div className="-mx-6 -my-8 flex h-screen sm:-mx-10">
      <ChapterList
        chapters={chapters}
        activeId={activeId}
        completedIds={progress.completedChapterIds}
        isOwner={isEditor}
        onSelect={handleSelectChapter}
        onAdd={handleAddChapter}
        onMove={handleMoveChapter}
        onDelete={handleDeleteChapter}
      />

      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between border-b border-ink-line bg-ink-soft/50 px-6 py-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-paper-faint">
              {book.ownerName} / <span className="text-paper">{book.title}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                book.visibility === "private"
                  ? "border-amber-dim text-amber-soft"
                  : "border-mint-dim text-mint"
              }`}
            >
              {book.visibility === "private" ? "Privat" : "Publik"}
            </span>
            {isOwner && (
              <button
                onClick={handleToggleVisibility}
                className="rounded-md border border-ink-line px-3 py-1.5 text-xs text-paper-dim hover:border-paper-dim"
              >
                {book.visibility === "private" ? "Jadikan publik" : "Jadikan privat"}
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setCollabPanelOpen(true)}
                className="rounded-md border border-ink-line px-3 py-1.5 text-xs text-paper-dim hover:border-paper-dim"
              >
                Kolaborator{book.coAuthors.length > 0 ? ` (${book.coAuthors.length})` : ""}
              </button>
            )}
            {!isEditor && (
              <ReportButton
                targetType="book"
                targetId={book.id}
                targetLabel={book.title}
                targetHref={`/dashboard/kelas/${book.id}`}
              />
            )}
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-6 py-10">
          {!activeChapter ? (
            <p className="text-sm text-paper-dim">Pilih atau tambah bab.</p>
          ) : isEditor && editMode ? (
            <div>
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full border-b border-ink-line bg-transparent pb-2 font-display text-2xl font-semibold text-paper outline-none focus:border-amber"
                placeholder="Judul bab"
              />
              <div className="mt-5 flex gap-1 rounded-md border border-ink-line bg-ink-soft p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setEditorTab("tulis")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    editorTab === "tulis" ? "bg-ink-surface text-paper" : "text-paper-dim"
                  }`}
                >
                  Tulis
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("pratinjau")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    editorTab === "pratinjau" ? "bg-ink-surface text-paper" : "text-paper-dim"
                  }`}
                >
                  Pratinjau
                </button>
                <button
                  type="button"
                  onClick={handleAiReview}
                  disabled={aiLoading || draftContent.trim().length < 10}
                  className="ml-auto rounded px-3 py-1 text-xs font-medium text-amber-soft hover:bg-amber/10 disabled:opacity-50"
                >
                  {aiLoading ? "Meminta review..." : "✨ Minta review AI"}
                </button>
              </div>

              {aiError && (
                <p className="mt-2 text-xs text-[#F45D5D]">{aiError}</p>
              )}
              {aiFeedback && (
                <div className="mt-3 rounded-md border border-amber-dim bg-amber/5 p-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-soft">
                    Masukan AI
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-paper-dim">{aiFeedback}</p>
                </div>
              )}

              {editorTab === "tulis" ? (
                <textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={16}
                  className="mt-3 w-full rounded-md border border-ink-line bg-ink-soft px-4 py-3 font-mono text-sm text-paper outline-none focus:border-amber"
                  placeholder="Tulis isi bab pakai Markdown..."
                />
              ) : (
                <div className="prose-tsc mt-3 min-h-[300px] rounded-md border border-ink-line bg-ink-soft px-4 py-3">
                  {draftContent.trim() ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(draftContent) }} />
                  ) : (
                    <p className="text-sm text-paper-faint">Belum ada isi untuk dipratinjau.</p>
                  )}
                </div>
              )}

              <QuizEditor quiz={draftQuiz} onChange={setDraftQuiz} />

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleSaveChapter}
                  disabled={saving}
                  className="rounded-md bg-amber px-5 py-2 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan bab"}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="rounded-md border border-ink-line px-5 py-2 text-sm text-paper-dim"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
                  {activeChapter.title}
                </h1>
                {isEditor && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="shrink-0 rounded-md border border-ink-line px-3 py-1.5 text-xs text-paper-dim hover:border-paper-dim"
                  >
                    Edit bab
                  </button>
                )}
              </div>

              <div
                className="prose-tsc mt-6"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(activeChapter.content) }}
              />

              {!isEditor && (
                <button
                  onClick={handleToggleComplete}
                  className={`mt-8 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    isDone
                      ? "border-mint bg-mint/10 text-mint"
                      : "border-ink-line text-paper-dim hover:border-paper-dim"
                  }`}
                >
                  {isDone ? "✓ Selesai dibaca" : "Tandai selesai"}
                </button>
              )}

              {!isEditor && allChaptersDone && (
                <div className="mt-4 flex items-center gap-3 rounded-card border border-amber-dim bg-amber/5 px-4 py-3">
                  <span className="text-lg">🎓</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-soft">
                      Semua bab selesai — buku ini kelar!
                    </p>
                    <p className="text-xs text-paper-faint">Unduh sertifikat sebagai bukti penyelesaian.</p>
                  </div>
                  <button
                    onClick={handleDownloadCertificate}
                    className="shrink-0 rounded-md bg-amber px-3 py-2 text-xs font-semibold text-ink"
                  >
                    Unduh sertifikat
                  </button>
                </div>
              )}

              {activeChapter.quiz.length > 0 &&
                (isEditor ? (
                  <div className="mt-8 rounded-card border border-dashed border-ink-line p-4 text-sm text-paper-faint">
                    Quiz bab ini ({activeChapter.quiz.length} pertanyaan) — klik &quot;Edit bab&quot; untuk mengubahnya.
                  </div>
                ) : (
                  <QuizBlock
                    quiz={activeChapter.quiz}
                    previousScore={progress.quizScores[activeChapter.id]}
                    onSubmit={handleQuizSubmit}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {collabPanelOpen && isOwner && (
        <CollaboratorPanel
          bookId={book.id}
          coAuthors={book.coAuthors}
          onClose={() => setCollabPanelOpen(false)}
          onChanged={() => {}}
        />
      )}
    </div>
  );
}
