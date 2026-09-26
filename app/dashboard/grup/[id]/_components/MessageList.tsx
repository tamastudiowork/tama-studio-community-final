"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { GroupMessage } from "@/lib/groups";
import { flagSuspiciousLinks } from "@/lib/linkSafety";
import { validateFile } from "@/lib/fileUpload";
import ReportButton from "@/components/ReportButton";
import AttachmentView from "./AttachmentView";

function timeLabel(ms: number) {
  return new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function MessageText({ text }: { text: string }) {
  const flags = flagSuspiciousLinks(text);
  return (
    <>
      <p className="whitespace-pre-wrap break-words text-sm text-paper-dim">{text}</p>
      {flags.map((f) => (
        <div key={f.url} className="mt-1.5 rounded-md border border-amber-dim bg-amber/5 px-2.5 py-1.5 text-xs text-amber-soft">
          ⚠ Tautan ini patut diwaspadai ({f.reasons.join(", ")}). Jangan klik kalau tidak yakin sumbernya.
        </div>
      ))}
    </>
  );
}

export default function MessageList({
  messages,
  currentUid,
  canModerate,
  groupId,
  onTogglePin,
  onDelete,
  onSend,
  onEdit,
  onSendFile,
}: {
  messages: GroupMessage[];
  currentUid: string;
  canModerate: boolean;
  groupId: string;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onSend: (text: string) => void;
  onEdit: (id: string, text: string) => void;
  onSendFile: (file: File, onProgress: (pct: number) => void) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setUploadPct(0);
    try {
      await onSendFile(file, setUploadPct);
    } catch {
      setFileError("Gagal mengunggah file. Coba lagi.");
    } finally {
      setUploadPct(null);
    }
  }

  function startEdit(m: GroupMessage) {
    setEditingId(m.id);
    setEditText(m.text);
  }

  function submitEdit(id: string) {
    if (editText.trim()) onEdit(id, editText);
    setEditingId(null);
  }

  useEffect(() => {
    if (!showPinnedOnly) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, showPinnedOnly]);

  const pinnedCount = messages.filter((m) => m.pinned).length;
  const visible = showPinnedOnly ? messages.filter((m) => m.pinned) : messages;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      {pinnedCount > 0 && (
        <button
          onClick={() => setShowPinnedOnly((v) => !v)}
          className="border-b border-ink-line bg-ink-soft/60 px-4 py-2 text-left font-mono text-xs text-amber-soft"
        >
          📌 {pinnedCount} pesan disematkan {showPinnedOnly ? "— tampilkan semua" : "— lihat"}
        </button>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {visible.length === 0 && (
          <p className="mt-8 text-center text-sm text-paper-faint">Belum ada pesan. Mulai obrolan.</p>
        )}
        {visible.map((m) => (
          <div key={m.id} className="group flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-surface text-xs font-semibold text-amber-soft">
              {m.userPhotoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.userPhotoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                m.userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-paper">{m.userName}</span>
                <span className="font-mono text-[10.5px] text-paper-faint">{timeLabel(m.createdAt)}</span>
                {m.pinned && <span className="text-[10.5px] text-amber-soft">📌</span>}
                <span className="ml-auto hidden gap-2 group-hover:flex">
                  {m.userId === currentUid && (
                    <button
                      onClick={() => startEdit(m)}
                      className="text-[10.5px] text-paper-faint hover:text-paper"
                    >
                      Edit
                    </button>
                  )}
                  {(canModerate || m.userId === currentUid) && (
                    <button
                      onClick={() => onTogglePin(m.id, m.pinned)}
                      className="text-[10.5px] text-paper-faint hover:text-amber-soft"
                    >
                      {m.pinned ? "Lepas pin" : "Sematkan"}
                    </button>
                  )}
                  {(canModerate || m.userId === currentUid) && (
                    <button
                      onClick={() => onDelete(m.id)}
                      className="text-[10.5px] text-paper-faint hover:text-[#F45D5D]"
                    >
                      Hapus
                    </button>
                  )}
                  {m.userId !== currentUid && (
                    <ReportButton
                      targetType="message"
                      targetId={m.id}
                      targetLabel={`Pesan dari ${m.userName}`}
                      targetHref={`/dashboard/grup/${groupId}`}
                      className="text-[10.5px] text-paper-faint hover:text-[#F45D5D]"
                    />
                  )}
                </span>
              </div>
              {editingId === m.id ? (
                <div className="mt-1 flex gap-2">
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitEdit(m.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded-md border border-amber bg-ink px-2.5 py-1.5 text-sm text-paper outline-none"
                  />
                  <button
                    onClick={() => submitEdit(m.id)}
                    className="rounded-md bg-amber px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-ink-line px-3 py-1.5 text-xs text-paper-dim"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <>
                  {m.flaggedByAI && canModerate && (
                    <p className="mt-1 rounded-md border border-amber-dim bg-amber/5 px-2 py-1 text-[10.5px] text-amber-soft">
                      🤖 Ditandai AI: {m.flaggedReason || "berpotensi spam/kata kasar"} — cuma kelihatan buat moderator.
                    </p>
                  )}
                  {m.text && <MessageText text={m.text} />}
                  {m.edited && <span className="text-[10px] text-paper-faint">(diedit)</span>}
                  {m.attachment && <AttachmentView attachment={m.attachment} />}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {fileError && (
        <p className="border-t border-ink-line bg-[#F45D5D]/5 px-4 py-1.5 text-xs text-[#F45D5D]">{fileError}</p>
      )}
      {uploadPct !== null && (
        <p className="border-t border-ink-line bg-ink-soft/60 px-4 py-1.5 font-mono text-xs text-paper-faint">
          Mengunggah... {uploadPct}%
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-ink-line px-4 py-3">
        <input ref={fileInputRef} type="file" onChange={handleFilePick} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-ink-line px-3 py-2 text-sm text-paper-dim hover:border-paper-dim"
          title="Lampirkan file"
        >
          📎
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Kirim pesan..."
          className="flex-1 rounded-md border border-ink-line bg-ink-soft px-3.5 py-2 text-sm text-paper outline-none focus:border-amber"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
