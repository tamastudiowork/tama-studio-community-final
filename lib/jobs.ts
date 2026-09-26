import {
  addDoc,
  collection,
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
} from "firebase/firestore";
import { db } from "./firebase";
import { RepoService } from "./repos";
import { BookService } from "./books";

export type JobType = "penuh-waktu" | "paruh-waktu" | "lepas" | "magang";

export type Job = {
  id: string;
  posterId: string;
  posterName: string;
  title: string;
  company: string;
  type: JobType;
  description: string;
  tags: string[];
  createdAt: number;
};

export type Application = {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  portfolioLink: string;
  createdAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function jobFromDoc(id: string, data: DocumentData): Job {
  return {
    id,
    posterId: data.posterId,
    posterName: data.posterName,
    title: data.title,
    company: data.company,
    type: data.type ?? "penuh-waktu",
    description: data.description ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: toMillis(data.createdAt),
  };
}

const col = collection(db, "jobs");

export const JobService = {
  async create(
    poster: { uid: string; name: string },
    input: { title: string; company: string; type: JobType; description: string; tags: string[] }
  ): Promise<string> {
    const ref = await addDoc(col, {
      posterId: poster.uid,
      posterName: poster.name,
      title: input.title.trim(),
      company: input.company.trim(),
      type: input.type,
      description: input.description.trim(),
      tags: input.tags,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async get(id: string): Promise<Job | null> {
    const snap = await getDoc(doc(db, "jobs", id));
    if (!snap.exists()) return null;
    return jobFromDoc(snap.id, snap.data());
  },

  async listAll(): Promise<Job[]> {
    const q = query(col, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => jobFromDoc(d.id, d.data()));
  },

  /**
   * Kumpulkan tag dari repo & buku milik user sebagai proksi "skill" —
   * bukan matching berbasis AI/ML sungguhan, cuma overlap kata kunci
   * sederhana antara tag lowongan dan tag karya user.
   */
  async getUserSkillTags(uid: string): Promise<Set<string>> {
    const [repos, books] = await Promise.all([RepoService.listMine(uid), BookService.listMine(uid)]);
    const tags = new Set<string>();
    repos.forEach((r) => r.tags.forEach((t) => tags.add(t)));
    books.forEach((b) => b.tags.forEach((t) => tags.add(t)));
    return tags;
  },

  matchScore(job: Job, userTags: Set<string>): number {
    if (job.tags.length === 0) return 0;
    const overlap = job.tags.filter((t) => userTags.has(t)).length;
    return Math.round((overlap / job.tags.length) * 100);
  },

  async applications(jobId: string): Promise<Application[]> {
    const q = query(collection(db, "jobs", jobId, "applications"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        applicantId: data.applicantId,
        applicantName: data.applicantName,
        applicantEmail: data.applicantEmail ?? "",
        message: data.message ?? "",
        portfolioLink: data.portfolioLink ?? "",
        createdAt: toMillis(data.createdAt),
      };
    });
  },

  subscribeApplications(jobId: string, cb: (apps: Application[]) => void) {
    const q = query(collection(db, "jobs", jobId, "applications"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            applicantId: data.applicantId,
            applicantName: data.applicantName,
            applicantEmail: data.applicantEmail ?? "",
            message: data.message ?? "",
            portfolioLink: data.portfolioLink ?? "",
            createdAt: toMillis(data.createdAt),
          };
        })
      )
    );
  },

  async hasApplied(jobId: string, uid: string): Promise<boolean> {
    const snap = await getDoc(doc(db, "jobs", jobId, "applications", uid));
    return snap.exists();
  },

  async apply(
    jobId: string,
    applicant: { uid: string; name: string; email: string },
    input: { message: string; portfolioLink: string }
  ) {
    await setDoc(doc(db, "jobs", jobId, "applications", applicant.uid), {
      applicantId: applicant.uid,
      applicantName: applicant.name,
      applicantEmail: applicant.email,
      message: input.message.trim(),
      portfolioLink: input.portfolioLink.trim(),
      createdAt: serverTimestamp(),
    });
  },
};
