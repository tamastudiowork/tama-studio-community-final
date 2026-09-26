"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { DmService, type Conversation, type DirectMessage } from "@/lib/dms";

function timeLabel(ms: number) {
  return new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function PesanContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const startUid = searchParams.get("uid");
  const startName = searchParams.get("name");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsub = DmService.subscribeMine(user.uid, setConversations);
    return unsub;
  }, [user]);

  // Kalau datang dari tombol "Kirim pesan" di panel anggota grup, pastikan
  // percakapannya ada lalu langsung buka.
  useEffect(() => {
    if (!user || !startUid || !startName) return;
    DmService.ensureConversation(
      { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
      { uid: startUid, name: startName, photoURL: null }
    ).then(setActiveId);
  }, [user, startUid, startName]);

  useEffect(() => {
    if (!activeId) return;
    const unsub = DmService.subscribeMessages(activeId, setMessages);
    return unsub;
  }, [activeId]);

  // Tandai percakapan ini sudah dibaca begitu dibuka.
  useEffect(() => {
    if (!activeId || !user) return;
    DmService.markRead(activeId, user.uid);
  }, [activeId, user]);

  const activeConvo = useMemo(() => conversations.find((c) => c.id === activeId), [conversations, activeId]);
  const otherName = useMemo(() => {
    if (!activeConvo || !user) return startName ?? "";
    const otherId = activeConvo.participantIds.find((id) => id !== user.uid);
    return otherId ? activeConvo.participantNames[otherId] : "";
  }, [activeConvo, user, startName]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!user || !activeId || !text.trim()) return;
    await DmService.sendMessage(activeId, user.uid, text);
    setText("");
  }

  function startEdit(m: DirectMessage) {
    setEditingId(m.id);
    setEditText(m.text);
  }

  function submitEdit(id: string) {
    if (activeId && editText.trim()) DmService.editMessage(activeId, id, editText);
    setEditingId(null);
  }

  return (
    <div className="-mx-6 -my-8 flex h-screen sm:-mx-10">
      <aside className="w-72 shrink-0 border-r border-ink-line bg-ink-soft/40 px-3 py-5">
        <p className="px-2 font-mono text-xs uppercase tracking-wide text-paper-faint">Kotak Pesan</p>
        <div className="mt-3 space-y-0.5">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-xs text-paper-faint">
              Belum ada percakapan. Mulai dari panel anggota di sebuah grup.
            </p>
          )}
          {conversations.map((c) => {
            const otherId = c.participantIds.find((id) => id !== user?.uid) ?? "";
            const name = c.participantNames[otherId] ?? "Pengguna";
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                  c.id === activeId ? "bg-ink-surface text-paper" : "text-paper-dim hover:bg-ink-surface/60"
                }`}
              >
                <p className="truncate">{name}</p>
                {c.lastMessage && <p className="truncate text-xs text-paper-faint">{c.lastMessage}</p>}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-paper-dim">
            Pilih percakapan.
          </div>
        ) : (
          <>
            <div className="border-b border-ink-line bg-ink-soft/50 px-4 py-3">
              <p className="text-sm font-medium text-paper">{otherName}</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => {
                const mine = m.senderId === user?.uid;
                const isEditing = editingId === m.id;
                return (
                  <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                    {isEditing ? (
                      <div className="flex w-full max-w-xs gap-1.5">
                        <input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitEdit(m.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 rounded-md border border-amber bg-ink-soft px-2.5 py-1.5 text-sm text-paper outline-none"
                        />
                        <button
                          onClick={() => submitEdit(m.id)}
                          className="rounded-md bg-amber px-2.5 py-1.5 text-xs font-semibold text-ink"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {mine && (
                          <button
                            onClick={() => startEdit(m)}
                            className="hidden text-[10px] text-paper-faint hover:text-paper group-hover:block"
                          >
                            Edit
                          </button>
                        )}
                        <div
                          className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                            mine ? "bg-amber text-ink" : "bg-ink-soft text-paper-dim"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <p className={`mt-1 text-[10px] ${mine ? "text-ink/60" : "text-paper-faint"}`}>
                            {timeLabel(m.createdAt)}
                            {m.edited && " · diedit"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-ink-line px-4 py-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis pesan..."
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
          </>
        )}
      </div>
    </div>
  );
}

export default function PesanPage() {
  return (
    <Suspense fallback={<p className="p-8 font-mono text-sm text-paper-faint">Memuat...</p>}>
      <PesanContent />
    </Suspense>
  );
}
