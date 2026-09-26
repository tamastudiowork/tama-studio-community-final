import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type BookVisibility = "public" | "private";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type CoAuthor = { uid: string; name: string; email: string };

export type Book = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL: string | null;
  title: string;
  description: string;
  visibility: BookVisibility;
  tags: string[];
  chaptersCount: number;
  coAuthors: CoAuthor[];
  coAuthorIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type Chapter = {
  id: string;
  title: string;
  order: number;
  content: string;
  quiz: QuizQuestion[];
  createdAt: number;
  updatedAt: number;
};

export type Progress = {
  completedChapterIds: string[];
  quizScores: Record<string, number>; // chapterId -> fraksi benar 0..1
  updatedAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function bookFromDoc(id: string, data: DocumentData): Book {
  return {
    id,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    ownerPhotoURL: data.ownerPhotoURL ?? null,
    title: data.title,
    description: data.description ?? "",
    visibility: data.visibility === "private" ? "private" : "public",
    tags: Array.isArray(data.tags) ? data.tags : [],
    chaptersCount: data.chaptersCount ?? 0,
    coAuthors: Array.isArray(data.coAuthors) ? data.coAuthors : [],
    coAuthorIds: Array.isArray(data.coAuthorIds) ? data.coAuthorIds : [],
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function chapterFromDoc(id: string, data: DocumentData): Chapter {
  return {
    id,
    title: data.title ?? "Tanpa judul",
    order: data.order ?? 0,
    content: data.content ?? "",
    quiz: Array.isArray(data.quiz) ? data.quiz : [],
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

const booksCol = collection(db, "books");

export const BookService = {
  async create(
    owner: { uid: string; name: string; photoURL: string | null },
    input: { title: string; description: string; visibility: BookVisibility; tags: string[] }
  ): Promise<string> {
    const ref = await addDoc(booksCol, {
      ownerId: owner.uid,
      ownerName: owner.name,
      ownerPhotoURL: owner.photoURL,
      title: input.title.trim() || "Buku tanpa judul",
      description: input.description.trim(),
      visibility: input.visibility,
      tags: input.tags,
      chaptersCount: 0,
      coAuthors: [],
      coAuthorIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Bab pertama otomatis, supaya buku baru tidak kosong melompong.
    await addDoc(collection(db, "books", ref.id, "chapters"), {
      title: "Pengantar",
      order: 0,
      content: "Tulis pengantar bab pertama di sini.",
      quiz: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "books", ref.id), { chaptersCount: 1 });

    return ref.id;
  },

  async get(id: string): Promise<Book | null> {
    const snap = await getDoc(doc(db, "books", id));
    if (!snap.exists()) return null;
    return bookFromDoc(snap.id, snap.data());
  },

  subscribe(id: string, cb: (book: Book | null) => void) {
    return onSnapshot(doc(db, "books", id), (snap) => {
      cb(snap.exists() ? bookFromDoc(snap.id, snap.data()) : null);
    });
  },

  async updateMeta(
    id: string,
    meta: Partial<Pick<Book, "title" | "description" | "visibility" | "tags">>
  ) {
    await updateDoc(doc(db, "books", id), { ...meta, updatedAt: serverTimestamp() });
  },

  /** Siapa saja yang boleh menulis/mengedit bab: pemilik ATAU salah satu co-author. */
  isEditor(book: Book, uid: string): boolean {
    return book.ownerId === uid || book.coAuthors.some((c) => c.uid === uid);
  },

  /**
   * Undang kolaborator lewat email. Cuma bisa kalau orang itu SUDAH
   * pernah login ke TSC minimal sekali (supaya ada entri di emailIndex).
   * Belum ada notifikasi ke orang yang diundang — begitu ditambahkan,
   * mereka langsung bisa ikut edit begitu buka buku ini sendiri.
   */
  async inviteCoAuthor(bookId: string, email: string): Promise<{ ok: boolean; reason?: string }> {
    const { UserService } = await import("./users");
    const uid = await UserService.findUidByEmail(email);
    if (!uid) return { ok: false, reason: "Belum ada akun TSC dengan email ini." };

    const book = await BookService.get(bookId);
    if (!book) return { ok: false, reason: "Buku tidak ditemukan." };
    if (uid === book.ownerId) return { ok: false, reason: "Ini email pemilik buku sendiri." };
    if (book.coAuthors.some((c) => c.uid === uid)) return { ok: false, reason: "Sudah jadi kolaborator." };

    const profile = await UserService.get(uid);
    const coAuthor: CoAuthor = { uid, name: profile?.name || email, email };
    await updateDoc(doc(db, "books", bookId), {
      coAuthors: [...book.coAuthors, coAuthor],
      coAuthorIds: [...book.coAuthorIds, uid],
      updatedAt: serverTimestamp(),
    });
    return { ok: true };
  },

  async removeCoAuthor(bookId: string, uid: string) {
    const book = await BookService.get(bookId);
    if (!book) return;
    await updateDoc(doc(db, "books", bookId), {
      coAuthors: book.coAuthors.filter((c) => c.uid !== uid),
      coAuthorIds: book.coAuthorIds.filter((id) => id !== uid),
      updatedAt: serverTimestamp(),
    });
  },

  async remove(id: string) {
    await deleteDoc(doc(db, "books", id));
  },

  async listMine(uid: string): Promise<Book[]> {
    const q = query(booksCol, where("ownerId", "==", uid), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => bookFromDoc(d.id, d.data()));
  },

  async listPublic(): Promise<Book[]> {
    const q = query(booksCol, where("visibility", "==", "public"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => bookFromDoc(d.id, d.data()));
  },

  subscribeChapters(bookId: string, cb: (chapters: Chapter[]) => void) {
    const q = query(collection(db, "books", bookId, "chapters"), orderBy("order", "asc"));
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => chapterFromDoc(d.id, d.data())));
    });
  },

  async listChapters(bookId: string): Promise<Chapter[]> {
    const q = query(collection(db, "books", bookId, "chapters"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => chapterFromDoc(d.id, d.data()));
  },

  async addChapter(bookId: string, afterOrder: number): Promise<string> {
    const ref = await addDoc(collection(db, "books", bookId, "chapters"), {
      title: "Bab baru",
      order: afterOrder + 1,
      content: "",
      quiz: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "books", bookId), {
      chaptersCount: (await getDocs(collection(db, "books", bookId, "chapters"))).size,
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateChapter(
    bookId: string,
    chapterId: string,
    data: Partial<Pick<Chapter, "title" | "content" | "quiz">>
  ) {
    await updateDoc(doc(db, "books", bookId, "chapters", chapterId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "books", bookId), { updatedAt: serverTimestamp() });
  },

  async deleteChapter(bookId: string, chapterId: string) {
    await deleteDoc(doc(db, "books", bookId, "chapters", chapterId));
    const remaining = await getDocs(collection(db, "books", bookId, "chapters"));
    await updateDoc(doc(db, "books", bookId), {
      chaptersCount: remaining.size,
      updatedAt: serverTimestamp(),
    });
  },

  /** Tukar posisi (order) sebuah bab dengan tetangganya. */
  async moveChapter(bookId: string, chapters: Chapter[], chapterId: string, direction: "up" | "down") {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === chapterId);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapWith];
    await updateDoc(doc(db, "books", bookId, "chapters", a.id), { order: b.order });
    await updateDoc(doc(db, "books", bookId, "chapters", b.id), { order: a.order });
  },

  // --- Progress (per pembaca) ---

  subscribeProgress(bookId: string, uid: string, cb: (progress: Progress) => void) {
    return onSnapshot(doc(db, "books", bookId, "progress", uid), (snap) => {
      const data = snap.data();
      cb({
        completedChapterIds: data?.completedChapterIds ?? [],
        quizScores: data?.quizScores ?? {},
        updatedAt: toMillis(data?.updatedAt),
      });
    });
  },

  async toggleChapterComplete(bookId: string, uid: string, chapterId: string) {
    const ref = doc(db, "books", bookId, "progress", uid);
    const snap = await getDoc(ref);
    const current: string[] = snap.data()?.completedChapterIds ?? [];
    const next = current.includes(chapterId)
      ? current.filter((id) => id !== chapterId)
      : [...current, chapterId];
    await setDoc(ref, { completedChapterIds: next, updatedAt: serverTimestamp() }, { merge: true });
  },

  async recordQuizScore(bookId: string, uid: string, chapterId: string, scoreFraction: number) {
    const ref = doc(db, "books", bookId, "progress", uid);
    const snap = await getDoc(ref);
    const scores: Record<string, number> = snap.data()?.quizScores ?? {};
    const best = Math.max(scores[chapterId] ?? 0, scoreFraction);
    await setDoc(
      ref,
      { quizScores: { ...scores, [chapterId]: best }, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },
};
