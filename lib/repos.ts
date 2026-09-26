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
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type RepoVisibility = "public" | "private";

export type RepoFile = { content: string; language?: string };
export type RepoFiles = Record<string, RepoFile>;

export type RepoCommit = {
  id: string;
  message: string;
  authorId: string;
  authorName: string;
  files: RepoFiles;
  createdAt: number;
};

export type Repo = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL: string | null;
  name: string;
  description: string;
  visibility: RepoVisibility;
  tags: string[];
  files: RepoFiles;
  forkedFrom: { id: string; name: string; ownerName: string } | null;
  forksCount: number;
  starsCount: number;
  viewsCount: number;
  createdAt: number;
  updatedAt: number;
};

function fromDoc(id: string, data: DocumentData): Repo {
  return {
    id,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    ownerPhotoURL: data.ownerPhotoURL ?? null,
    name: data.name,
    description: data.description ?? "",
    visibility: data.visibility === "private" ? "private" : "public",
    tags: Array.isArray(data.tags) ? data.tags : [],
    files: data.files ?? {},
    forkedFrom: data.forkedFrom ?? null,
    forksCount: data.forksCount ?? 0,
    starsCount: data.starsCount ?? 0,
    viewsCount: data.viewsCount ?? 0,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

const reposCol = collection(db, "repos");

export const RepoService = {
  async create(
    owner: { uid: string; name: string; photoURL: string | null },
    input: {
      name: string;
      description: string;
      visibility: RepoVisibility;
      tags: string[];
      files: RepoFiles;
    }
  ): Promise<string> {
    const ref = await addDoc(reposCol, {
      ownerId: owner.uid,
      ownerName: owner.name,
      ownerPhotoURL: owner.photoURL,
      name: input.name.trim() || "repo-tanpa-nama",
      description: input.description.trim(),
      visibility: input.visibility,
      tags: input.tags,
      files: input.files,
      forkedFrom: null,
      forksCount: 0,
      starsCount: 0,
      viewsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async get(id: string): Promise<Repo | null> {
    const snap = await getDoc(doc(db, "repos", id));
    if (!snap.exists()) return null;
    return fromDoc(snap.id, snap.data());
  },

  /** Live subscription — dipakai halaman editor supaya star/views count terasa real-time. */
  subscribe(id: string, cb: (repo: Repo | null) => void) {
    return onSnapshot(doc(db, "repos", id), (snap) => {
      cb(snap.exists() ? fromDoc(snap.id, snap.data()) : null);
    });
  },

  async updateFiles(id: string, files: RepoFiles) {
    await updateDoc(doc(db, "repos", id), { files, updatedAt: serverTimestamp() });
  },

  /**
   * Simpan file SEKALIGUS catat sebagai commit di riwayat. Setiap commit
   * menyimpan salinan PENUH semua file (bukan diff) — sederhana untuk
   * diimplementasikan, tapi artinya riwayat yang panjang jadi lumayan
   * berat di Firestore. Untuk repo kecil-menengah ini wajar; kalau
   * filenya besar dan sering commit, pertimbangkan batasi jumlah riwayat
   * yang disimpan (belum ada pembatasan otomatis di sini).
   */
  async commit(
    id: string,
    files: RepoFiles,
    message: string,
    author: { uid: string; name: string }
  ): Promise<string> {
    const ref = await addDoc(collection(db, "repos", id, "commits"), {
      message: message.trim() || "Update",
      authorId: author.uid,
      authorName: author.name,
      files,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "repos", id), { files, updatedAt: serverTimestamp() });
    return ref.id;
  },

  async listCommits(id: string): Promise<RepoCommit[]> {
    const q = query(collection(db, "repos", id, "commits"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        message: data.message,
        authorId: data.authorId,
        authorName: data.authorName,
        files: data.files ?? {},
        createdAt: toMillis(data.createdAt),
      };
    });
  },

  subscribeCommits(id: string, cb: (commits: RepoCommit[]) => void) {
    const q = query(collection(db, "repos", id, "commits"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            message: data.message,
            authorId: data.authorId,
            authorName: data.authorName,
            files: data.files ?? {},
            createdAt: toMillis(data.createdAt),
          };
        })
      )
    );
  },

  /** Pulihkan versi lama — ini SENDIRI dicatat sebagai commit baru, jadi riwayat tidak pernah hilang/di-rewrite. */
  async restoreCommit(id: string, commitId: string, author: { uid: string; name: string }): Promise<RepoFiles> {
    const snap = await getDoc(doc(db, "repos", id, "commits", commitId));
    if (!snap.exists()) throw new Error("Versi tidak ditemukan.");
    const files = (snap.data().files ?? {}) as RepoFiles;
    await RepoService.commit(id, files, `Pulihkan ke versi sebelumnya (${commitId.slice(0, 6)})`, author);
    return files;
  },

  async updateMeta(
    id: string,
    meta: Partial<Pick<Repo, "name" | "description" | "visibility" | "tags">>
  ) {
    await updateDoc(doc(db, "repos", id), { ...meta, updatedAt: serverTimestamp() });
  },

  async remove(id: string) {
    await deleteDoc(doc(db, "repos", id));
  },

  async listMine(uid: string): Promise<Repo[]> {
    const q = query(reposCol, where("ownerId", "==", uid), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  async listPublic(): Promise<Repo[]> {
    const q = query(reposCol, where("visibility", "==", "public"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  async incrementViews(id: string) {
    await updateDoc(doc(db, "repos", id), { viewsCount: increment(1) });
  },

  async isStarredByMe(repoId: string, uid: string): Promise<boolean> {
    const snap = await getDoc(doc(db, "repos", repoId, "stars", uid));
    return snap.exists();
  },

  async toggleStar(repoId: string, uid: string): Promise<boolean> {
    const starRef = doc(db, "repos", repoId, "stars", uid);
    const repoRef = doc(db, "repos", repoId);
    return runTransaction(db, async (tx) => {
      const starSnap = await tx.get(starRef);
      if (starSnap.exists()) {
        tx.delete(starRef);
        tx.update(repoRef, { starsCount: increment(-1) });
        return false;
      }
      tx.set(starRef, { createdAt: serverTimestamp() });
      tx.update(repoRef, { starsCount: increment(1) });
      return true;
    });
  },

  async fork(
    sourceId: string,
    newOwner: { uid: string; name: string; photoURL: string | null }
  ): Promise<string> {
    const source = await RepoService.get(sourceId);
    if (!source) throw new Error("Repo sumber tidak ditemukan.");

    const ref = await addDoc(reposCol, {
      ownerId: newOwner.uid,
      ownerName: newOwner.name,
      ownerPhotoURL: newOwner.photoURL,
      name: source.name,
      description: source.description,
      visibility: "public",
      tags: source.tags,
      files: source.files,
      forkedFrom: { id: source.id, name: source.name, ownerName: source.ownerName },
      forksCount: 0,
      starsCount: 0,
      viewsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "repos", sourceId), { forksCount: increment(1) });
    return ref.id;
  },

  async listComments(repoId: string): Promise<RepoComment[]> {
    const q = query(collection(db, "repos", repoId, "comments"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        userName: data.userName,
        userPhotoURL: data.userPhotoURL ?? null,
        text: data.text,
        createdAt: toMillis(data.createdAt),
      };
    });
  },

  subscribeComments(repoId: string, cb: (comments: RepoComment[]) => void) {
    const q = query(collection(db, "repos", repoId, "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            userName: data.userName,
            userPhotoURL: data.userPhotoURL ?? null,
            text: data.text,
            createdAt: toMillis(data.createdAt),
          };
        })
      );
    });
  },

  async addComment(
    repoId: string,
    author: { uid: string; name: string; photoURL: string | null },
    text: string
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await setDoc(doc(collection(db, "repos", repoId, "comments")), {
      userId: author.uid,
      userName: author.name,
      userPhotoURL: author.photoURL,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
  },
};

export type RepoComment = {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  text: string;
  createdAt: number;
};
