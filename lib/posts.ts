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
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type VoteValue = 1 | -1;

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  tags: string[];
  score: number;
  commentsCount: number;
  createdAt: number;
};

export type PostComment = {
  id: string;
  parentId: string | null;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  text: string;
  createdAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function fromDoc(id: string, data: DocumentData): Post {
  return {
    id,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL ?? null,
    title: data.title,
    description: data.description ?? "",
    url: data.url ?? "",
    imageUrl: data.imageUrl ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    score: data.score ?? 0,
    commentsCount: data.commentsCount ?? 0,
    createdAt: toMillis(data.createdAt),
  };
}

const col = collection(db, "posts");

export const PostService = {
  async create(
    author: { uid: string; name: string; photoURL: string | null },
    input: { title: string; description: string; url: string; imageUrl: string; tags: string[] }
  ): Promise<string> {
    const ref = await addDoc(col, {
      authorId: author.uid,
      authorName: author.name,
      authorPhotoURL: author.photoURL,
      title: input.title.trim(),
      description: input.description.trim(),
      url: input.url.trim(),
      imageUrl: input.imageUrl.trim(),
      tags: input.tags,
      score: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async get(id: string): Promise<Post | null> {
    const snap = await getDoc(doc(db, "posts", id));
    if (!snap.exists()) return null;
    return fromDoc(snap.id, snap.data());
  },

  subscribe(id: string, cb: (post: Post | null) => void) {
    return onSnapshot(doc(db, "posts", id), (snap) => {
      cb(snap.exists() ? fromDoc(snap.id, snap.data()) : null);
    });
  },

  async listAll(): Promise<Post[]> {
    const q = query(col, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  async listByAuthor(uid: string): Promise<Post[]> {
    const q = query(col, where("authorId", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  async remove(id: string) {
    await deleteDoc(doc(db, "posts", id));
  },

  async myVote(id: string, uid: string): Promise<VoteValue | 0> {
    const snap = await getDoc(doc(db, "posts", id, "votes", uid));
    return snap.exists() ? (snap.data().value as VoteValue) : 0;
  },

  async vote(id: string, uid: string, value: VoteValue): Promise<VoteValue | 0> {
    const voteRef = doc(db, "posts", id, "votes", uid);
    const postRef = doc(db, "posts", id);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(voteRef);
      const current = snap.exists() ? (snap.data().value as VoteValue) : 0;

      if (current === value) {
        tx.delete(voteRef);
        tx.update(postRef, { score: increment(-value) });
        return 0;
      }

      tx.set(voteRef, { value, updatedAt: serverTimestamp() });
      tx.update(postRef, { score: increment(value - current) });
      return value;
    });
  },

  subscribeComments(postId: string, cb: (comments: PostComment[]) => void) {
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            parentId: data.parentId ?? null,
            userId: data.userId,
            userName: data.userName,
            userPhotoURL: data.userPhotoURL ?? null,
            text: data.text,
            createdAt: toMillis(data.createdAt),
          };
        })
      )
    );
  },

  async addComment(
    postId: string,
    author: { uid: string; name: string; photoURL: string | null },
    text: string,
    parentId: string | null = null
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await addDoc(collection(db, "posts", postId, "comments"), {
      parentId,
      userId: author.uid,
      userName: author.name,
      userPhotoURL: author.photoURL,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "posts", postId), { commentsCount: increment(1) }, { merge: true });
  },
};
