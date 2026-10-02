import {
  addDoc,
  collection,
  DocumentData,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type RepoVisibility = "public" | "private";

// Isi repo disimpan sebagai peta nama-file -> isi file. Editor kode TSC
// (aplikasi terpisah, lihat app/dashboard/kode/[id]/page-client.tsx)
// membaca & menulis field `files` ini langsung dari Firestore.
export type RepoFile = { content: string };
export type RepoFiles = Record<string, RepoFile>;

export type Repo = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL: string | null;
  name: string;
  description: string;
  visibility: RepoVisibility;
  tags: string[];
  starsCount: number;
  forksCount: number;
  viewsCount: number;
  createdAt: number;
  updatedAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function repoFromDoc(id: string, data: DocumentData): Repo {
  return {
    id,
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "Anonim",
    ownerPhotoURL: data.ownerPhotoURL ?? null,
    name: data.name ?? "repo-tanpa-nama",
    description: data.description ?? "",
    visibility: data.visibility === "private" ? "private" : "public",
    tags: Array.isArray(data.tags) ? data.tags : [],
    starsCount: data.starsCount ?? 0,
    forksCount: data.forksCount ?? 0,
    viewsCount: data.viewsCount ?? 0,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
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
      starsCount: 0,
      forksCount: 0,
      viewsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  // Query ini cocok dengan index yang sudah ada di firestore.indexes.json:
  // (ownerId ASC, updatedAt DESC).
  async listMine(uid: string): Promise<Repo[]> {
    const q = query(reposCol, where("ownerId", "==", uid), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => repoFromDoc(d.id, d.data()));
  },

  // Index: (visibility ASC, updatedAt DESC). Repo privat sengaja tidak
  // pernah ikut di sini — sesuai firestore.rules.
  async listPublic(): Promise<Repo[]> {
    const q = query(reposCol, where("visibility", "==", "public"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => repoFromDoc(d.id, d.data()));
  },
};
