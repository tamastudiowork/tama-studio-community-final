import { collection, doc, getDocs, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type SkillStatus = "todo" | "learning" | "done";

export type SkillNode = {
  id: string;
  label: string;
  track: string;
  requires: string[]; // id node prasyarat
};

// Roadmap statis — bukan data yang diedit pengguna, cukup didefinisikan
// di kode. Kalau nanti mau bisa diedit dari admin dashboard, ini yang
// perlu dipindah ke Firestore.
export const SKILL_TREE: SkillNode[] = [
  { id: "html-css", label: "HTML & CSS", track: "Frontend", requires: [] },
  { id: "js-dasar", label: "JavaScript Dasar", track: "Frontend", requires: ["html-css"] },
  { id: "js-lanjut", label: "JavaScript Lanjut (async, modul)", track: "Frontend", requires: ["js-dasar"] },
  { id: "react-dasar", label: "React Dasar", track: "Frontend", requires: ["js-lanjut"] },
  { id: "react-lanjut", label: "State Management & Routing", track: "Frontend", requires: ["react-dasar"] },

  { id: "logika-dasar", label: "Logika Pemrograman", track: "Backend", requires: [] },
  { id: "bahasa-server", label: "Bahasa Sisi Server (Node/PHP/dll)", track: "Backend", requires: ["logika-dasar"] },
  { id: "database", label: "Database & SQL Dasar", track: "Backend", requires: ["bahasa-server"] },
  { id: "rest-api", label: "Membangun REST API", track: "Backend", requires: ["database"] },
  { id: "auth-keamanan", label: "Auth & Keamanan Dasar", track: "Backend", requires: ["rest-api"] },

  { id: "git-dasar", label: "Git & Version Control", track: "Alat & Kolaborasi", requires: [] },
  { id: "kolaborasi-tim", label: "Kolaborasi lewat Repo & Review Kode", track: "Alat & Kolaborasi", requires: ["git-dasar"] },
  { id: "deploy-dasar", label: "Deploy Aplikasi Pertama", track: "Alat & Kolaborasi", requires: ["kolaborasi-tim"] },
];

export const SkillTreeService = {
  subscribeProgress(uid: string, cb: (progress: Record<string, SkillStatus>) => void) {
    return onSnapshot(collection(db, "users", uid, "skills"), (snap) => {
      const progress: Record<string, SkillStatus> = {};
      snap.docs.forEach((d) => {
        progress[d.id] = d.data().status ?? "todo";
      });
      cb(progress);
    });
  },

  async setStatus(uid: string, skillId: string, status: SkillStatus) {
    await setDoc(
      doc(db, "users", uid, "skills", skillId),
      { status, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },
};
