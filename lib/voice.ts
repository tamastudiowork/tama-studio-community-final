import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type VoiceParticipant = {
  uid: string;
  name: string;
  photoURL: string | null;
  muted: boolean;
};

function participantsCol(groupId: string, channelId: string) {
  return collection(db, "groups", groupId, "channels", channelId, "voiceParticipants");
}

function callsCol(groupId: string, channelId: string) {
  return collection(db, "groups", groupId, "channels", channelId, "voiceCalls");
}

function fromDoc(id: string, data: DocumentData): VoiceParticipant {
  return { uid: id, name: data.name, photoURL: data.photoURL ?? null, muted: Boolean(data.muted) };
}

export const VoiceService = {
  async join(groupId: string, channelId: string, user: { uid: string; name: string; photoURL: string | null }) {
    await setDoc(doc(participantsCol(groupId, channelId), user.uid), {
      name: user.name,
      photoURL: user.photoURL,
      muted: false,
      joinedAt: serverTimestamp(),
    });
  },

  async leave(groupId: string, channelId: string, uid: string) {
    await deleteDoc(doc(participantsCol(groupId, channelId), uid));
    // Bersihkan semua dokumen sinyal panggilan yang melibatkan uid ini,
    // supaya tidak jadi sampah/nyangkut di Firestore.
    const snap = await getDocs(callsCol(groupId, channelId));
    await Promise.all(
      snap.docs
        .filter((d) => d.id.includes(uid))
        .map((d) => deleteDoc(d.ref))
    );
  },

  async setMuted(groupId: string, channelId: string, uid: string, muted: boolean) {
    await updateDoc(doc(participantsCol(groupId, channelId), uid), { muted });
  },

  subscribeParticipants(groupId: string, channelId: string, cb: (participants: VoiceParticipant[]) => void) {
    return onSnapshot(participantsCol(groupId, channelId), (snap) => {
      cb(snap.docs.map((d) => fromDoc(d.id, d.data())));
    });
  },

  /** ID dokumen sinyal deterministik per pasangan, supaya kedua sisi cocok ke dokumen yang sama. */
  callDocId(uidA: string, uidB: string) {
    return [uidA, uidB].sort().join("_");
  },

  callDocRef(groupId: string, channelId: string, uidA: string, uidB: string) {
    return doc(callsCol(groupId, channelId), VoiceService.callDocId(uidA, uidB));
  },

  candidatesCol(groupId: string, channelId: string, uidA: string, uidB: string, side: "caller" | "callee") {
    return collection(
      VoiceService.callDocRef(groupId, channelId, uidA, uidB),
      side === "caller" ? "callerCandidates" : "calleeCandidates"
    );
  },

  subscribeCall(
    groupId: string,
    channelId: string,
    uidA: string,
    uidB: string,
    cb: (data: DocumentData | undefined) => void
  ) {
    return onSnapshot(VoiceService.callDocRef(groupId, channelId, uidA, uidB), (snap) => cb(snap.data()));
  },

  async deleteCall(groupId: string, channelId: string, uidA: string, uidB: string) {
    await deleteDoc(VoiceService.callDocRef(groupId, channelId, uidA, uidB)).catch(() => {});
  },
};
