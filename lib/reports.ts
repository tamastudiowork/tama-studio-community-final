import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type ReportTargetType = "repo" | "book" | "group" | "message" | "showcase" | "clip" | "job" | "post";
export type ReportStatus = "pending" | "resolved" | "dismissed";

export type Report = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  targetHref: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: ReportStatus;
  createdAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function fromDoc(id: string, data: DocumentData): Report {
  return {
    id,
    targetType: data.targetType,
    targetId: data.targetId,
    targetLabel: data.targetLabel ?? "",
    targetHref: data.targetHref ?? "",
    reporterId: data.reporterId,
    reporterName: data.reporterName ?? "Anonim",
    reason: data.reason ?? "",
    status: data.status ?? "pending",
    createdAt: toMillis(data.createdAt),
  };
}

const reportsCol = collection(db, "reports");

export const ReportService = {
  async create(input: {
    targetType: ReportTargetType;
    targetId: string;
    targetLabel: string;
    targetHref: string;
    reporterId: string;
    reporterName: string;
    reason: string;
  }) {
    await addDoc(reportsCol, {
      ...input,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  },

  async listAll(): Promise<Report[]> {
    const q = query(reportsCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  subscribeAll(cb: (reports: Report[]) => void) {
    const q = query(reportsCol, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromDoc(d.id, d.data()))));
  },

  async setStatus(id: string, status: ReportStatus) {
    await updateDoc(doc(db, "reports", id), { status });
  },
};
