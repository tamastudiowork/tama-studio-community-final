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
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type Conversation = {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string | null>;
  lastMessage: string;
  lastSenderId: string;
  lastReadAt: Record<string, number>;
  updatedAt: number;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  text: string;
  edited: boolean;
  createdAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function conversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

function convoFromDoc(id: string, data: DocumentData): Conversation {
  const lastReadRaw = data.lastReadAt ?? {};
  const lastReadAt: Record<string, number> = {};
  for (const uid of Object.keys(lastReadRaw)) {
    lastReadAt[uid] = lastReadRaw[uid] ? toMillis(lastReadRaw[uid]) : 0;
  }
  return {
    id,
    participantIds: data.participantIds ?? [],
    participantNames: data.participantNames ?? {},
    participantPhotos: data.participantPhotos ?? {},
    lastMessage: data.lastMessage ?? "",
    lastSenderId: data.lastSenderId ?? "",
    lastReadAt,
    updatedAt: toMillis(data.updatedAt),
  };
}

export const DmService = {
  idFor: conversationId,

  async ensureConversation(
    userA: { uid: string; name: string; photoURL: string | null },
    userB: { uid: string; name: string; photoURL: string | null }
  ): Promise<string> {
    const id = conversationId(userA.uid, userB.uid);
    const ref = doc(db, "conversations", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        participantIds: [userA.uid, userB.uid],
        participantNames: { [userA.uid]: userA.name, [userB.uid]: userB.name },
        participantPhotos: { [userA.uid]: userA.photoURL, [userB.uid]: userB.photoURL },
        lastMessage: "",
        lastSenderId: "",
        lastReadAt: {},
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  },

  async listMine(uid: string): Promise<Conversation[]> {
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", uid),
      orderBy("updatedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => convoFromDoc(d.id, d.data()));
  },

  subscribeMine(uid: string, cb: (conversations: Conversation[]) => void) {
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", uid),
      orderBy("updatedAt", "desc")
    );
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => convoFromDoc(d.id, d.data()))));
  },

  subscribeConversation(id: string, cb: (c: Conversation | null) => void) {
    return onSnapshot(doc(db, "conversations", id), (snap) => {
      cb(snap.exists() ? convoFromDoc(snap.id, snap.data()) : null);
    });
  },

  subscribeMessages(conversationId: string, cb: (messages: DirectMessage[]) => void) {
    const q = query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          senderId: d.data().senderId,
          text: d.data().text,
          edited: Boolean(d.data().edited),
          createdAt: toMillis(d.data().createdAt),
        }))
      );
    });
  },

  async sendMessage(conversationId: string, senderId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      senderId,
      text: trimmed,
      edited: false,
      createdAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, "conversations", conversationId),
      { lastMessage: trimmed, lastSenderId: senderId, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },

  async editMessage(conversationId: string, messageId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await updateDoc(doc(db, "conversations", conversationId, "messages", messageId), {
      text: trimmed,
      edited: true,
    });
  },

  async markRead(conversationId: string, uid: string) {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`lastReadAt.${uid}`]: serverTimestamp(),
    });
  },

  /** Hitung berapa percakapan punya pesan baru dari lawan bicara sejak terakhir dibuka. */
  async countUnread(uid: string): Promise<number> {
    const conversations = await DmService.listMine(uid);
    return conversations.filter((c) => {
      if (c.lastSenderId === uid || !c.lastSenderId) return false;
      const lastRead = c.lastReadAt[uid] ?? 0;
      return c.updatedAt > lastRead;
    }).length;
  },
};
