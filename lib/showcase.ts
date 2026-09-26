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
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type ShowcaseItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  title: string;
  description: string;
  imageUrl: string;
  repoId: string | null;
  tags: string[];
  likesCount: number;
  createdAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function fromDoc(id: string, data: DocumentData): ShowcaseItem {
  return {
    id,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL ?? null,
    title: data.title,
    description: data.description ?? "",
    imageUrl: data.imageUrl ?? "",
    repoId: data.repoId ?? null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    likesCount: data.likesCount ?? 0,
    createdAt: toMillis(data.createdAt),
  };
}

const col = collection(db, "showcase");

export const ShowcaseService = {
  async create(
    author: { uid: string; name: string; photoURL: string | null },
    input: { title: string; description: string; imageUrl: string; repoId: string | null; tags: string[] }
  ): Promise<string> {
    const ref = await addDoc(col, {
      authorId: author.uid,
      authorName: author.name,
      authorPhotoURL: author.photoURL,
      title: input.title.trim() || "Tanpa judul",
      description: input.description.trim(),
      imageUrl: input.imageUrl.trim(),
      repoId: input.repoId,
      tags: input.tags,
      likesCount: 0,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async get(id: string): Promise<ShowcaseItem | null> {
    const snap = await getDoc(doc(db, "showcase", id));
    if (!snap.exists()) return null;
    return fromDoc(snap.id, snap.data());
  },

  subscribe(id: string, cb: (item: ShowcaseItem | null) => void) {
    return onSnapshot(doc(db, "showcase", id), (snap) => {
      cb(snap.exists() ? fromDoc(snap.id, snap.data()) : null);
    });
  },

  async listAll(): Promise<ShowcaseItem[]> {
    const q = query(col, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  async listMine(uid: string): Promise<ShowcaseItem[]> {
    const q = query(col, where("authorId", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  async remove(id: string) {
    await deleteDoc(doc(db, "showcase", id));
  },

  async isLikedByMe(id: string, uid: string): Promise<boolean> {
    const snap = await getDoc(doc(db, "showcase", id, "likes", uid));
    return snap.exists();
  },

  async toggleLike(id: string, uid: string): Promise<boolean> {
    const likeRef = doc(db, "showcase", id, "likes", uid);
    const itemRef = doc(db, "showcase", id);
    return runTransaction(db, async (tx) => {
      const likeSnap = await tx.get(likeRef);
      if (likeSnap.exists()) {
        tx.delete(likeRef);
        tx.update(itemRef, { likesCount: increment(-1) });
        return false;
      }
      tx.set(likeRef, { createdAt: serverTimestamp() });
      tx.update(itemRef, { likesCount: increment(1) });
      return true;
    });
  },
};
