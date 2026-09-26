import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type Clip = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  caption: string;
  code: string;
  language: string;
  upvotesCount: number;
  createdAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function fromDoc(id: string, data: DocumentData): Clip {
  return {
    id,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL ?? null,
    caption: data.caption ?? "",
    code: data.code ?? "",
    language: data.language ?? "text",
    upvotesCount: data.upvotesCount ?? 0,
    createdAt: toMillis(data.createdAt),
  };
}

const col = collection(db, "clips");

export const ClipService = {
  async create(
    author: { uid: string; name: string; photoURL: string | null },
    input: { caption: string; code: string; language: string }
  ): Promise<string> {
    const ref = await addDoc(col, {
      authorId: author.uid,
      authorName: author.name,
      authorPhotoURL: author.photoURL,
      caption: input.caption.trim(),
      code: input.code,
      language: input.language,
      upvotesCount: 0,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  subscribeFeed(cb: (clips: Clip[]) => void) {
    const q = query(col, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromDoc(d.id, d.data()))));
  },

  async remove(id: string) {
    await deleteDoc(doc(db, "clips", id));
  },

  async isUpvotedByMe(id: string, uid: string): Promise<boolean> {
    const snap = await getDoc(doc(db, "clips", id, "upvotes", uid));
    return snap.exists();
  },

  async toggleUpvote(id: string, uid: string): Promise<boolean> {
    const upRef = doc(db, "clips", id, "upvotes", uid);
    const clipRef = doc(db, "clips", id);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(upRef);
      if (snap.exists()) {
        tx.delete(upRef);
        tx.update(clipRef, { upvotesCount: increment(-1) });
        return false;
      }
      tx.set(upRef, { createdAt: serverTimestamp() });
      tx.update(clipRef, { upvotesCount: increment(1) });
      return true;
    });
  },
};
