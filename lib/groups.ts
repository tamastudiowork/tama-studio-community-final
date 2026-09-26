import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  increment,
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

export type JoinMethod = "public" | "code" | "approval" | "link";
export type MemberRole = "owner" | "admin" | "member";

export type Group = {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  description: string;
  joinMethod: JoinMethod;
  inviteCode: string | null;
  memberCount: number;
  lastMessageAt: number;
  createdAt: number;
  updatedAt: number;
};

export type Member = {
  uid: string;
  name: string;
  photoURL: string | null;
  role: MemberRole;
  joinedAt: number;
  lastReadAt: number;
};

export type JoinRequest = {
  uid: string;
  name: string;
  photoURL: string | null;
  requestedAt: number;
};

export type ChannelType = "text" | "voice";

export type Channel = {
  id: string;
  name: string;
  type: ChannelType;
  order: number;
  createdAt: number;
};

export type ScanStatus = "pending" | "clean" | "flagged" | "unscanned";

export type MessageAttachment = {
  name: string;
  url: string;
  size: number;
  contentType: string;
  storagePath: string;
  scanStatus: ScanStatus;
};

export type GroupMessage = {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  text: string;
  pinned: boolean;
  edited: boolean;
  attachment: MessageAttachment | null;
  flaggedByAI: boolean;
  flaggedReason: string;
  createdAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function groupFromDoc(id: string, data: DocumentData): Group {
  return {
    id,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    name: data.name,
    description: data.description ?? "",
    joinMethod: data.joinMethod ?? "public",
    inviteCode: data.inviteCode ?? null,
    memberCount: data.memberCount ?? 0,
    lastMessageAt: toMillis(data.lastMessageAt ?? data.createdAt),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function randomCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa karakter ambigu
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const groupsCol = collection(db, "groups");

export const GroupService = {
  async create(
    owner: { uid: string; name: string; photoURL: string | null },
    input: { name: string; description: string; joinMethod: JoinMethod }
  ): Promise<string> {
    const ref = await addDoc(groupsCol, {
      ownerId: owner.uid,
      ownerName: owner.name,
      name: input.name.trim() || "Grup tanpa nama",
      description: input.description.trim(),
      joinMethod: input.joinMethod,
      inviteCode: input.joinMethod === "code" ? randomCode() : null,
      memberCount: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, "groups", ref.id, "members", owner.uid), {
      uid: owner.uid,
      name: owner.name,
      photoURL: owner.photoURL,
      role: "owner",
      joinedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "groups", ref.id, "channels"), {
      name: "umum",
      order: 0,
      createdAt: serverTimestamp(),
    });

    return ref.id;
  },

  async get(id: string): Promise<Group | null> {
    const snap = await getDoc(doc(db, "groups", id));
    if (!snap.exists()) return null;
    return groupFromDoc(snap.id, snap.data());
  },

  subscribe(id: string, cb: (group: Group | null) => void) {
    return onSnapshot(doc(db, "groups", id), (snap) => {
      cb(snap.exists() ? groupFromDoc(snap.id, snap.data()) : null);
    });
  },

  async listMine(uid: string): Promise<Group[]> {
    // collectionGroup query lintas semua subkoleksi `members`, dicocokkan
    // lewat field `uid` (bukan doc ID) — jadi tidak perlu koleksi index
    // terpisah yang berisiko out-of-sync.
    const q = query(collectionGroup(db, "members"), where("uid", "==", uid));
    const snap = await getDocs(q);
    const ids = snap.docs
      .map((d) => d.ref.parent.parent?.id)
      .filter((id): id is string => Boolean(id));
    const groups = await Promise.all(ids.map((id) => GroupService.get(id)));
    return groups.filter((g): g is Group => g !== null).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /** Hanya grup dengan joinMethod publik/kode/approval yang muncul di listing — 'link' sengaja disembunyikan. */
  async listPublic(): Promise<Group[]> {
    const q = query(groupsCol, where("joinMethod", "in", ["public", "code", "approval"]), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => groupFromDoc(d.id, d.data()));
  },

  async isMember(groupId: string, uid: string): Promise<Member | null> {
    const snap = await getDoc(doc(db, "groups", groupId, "members", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { uid, name: data.name, photoURL: data.photoURL ?? null, role: data.role, joinedAt: toMillis(data.joinedAt), lastReadAt: data.lastReadAt ? toMillis(data.lastReadAt) : 0 };
  },

  subscribeMembers(groupId: string, cb: (members: Member[]) => void) {
    return onSnapshot(collection(db, "groups", groupId, "members"), (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return { uid: d.id, name: data.name, photoURL: data.photoURL ?? null, role: data.role, joinedAt: toMillis(data.joinedAt), lastReadAt: data.lastReadAt ? toMillis(data.lastReadAt) : 0 };
        })
      );
    });
  },

  async addMember(groupId: string, user: { uid: string; name: string; photoURL: string | null }, role: MemberRole = "member") {
    await setDoc(doc(db, "groups", groupId, "members", user.uid), {
      uid: user.uid,
      name: user.name,
      photoURL: user.photoURL,
      role,
      joinedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "groups", groupId), { memberCount: increment(1), updatedAt: serverTimestamp() });
  },

  async removeMember(groupId: string, uid: string) {
    await deleteDoc(doc(db, "groups", groupId, "members", uid));
    await updateDoc(doc(db, "groups", groupId), { memberCount: increment(-1), updatedAt: serverTimestamp() });
  },

  async setMemberRole(groupId: string, uid: string, role: MemberRole) {
    await updateDoc(doc(db, "groups", groupId, "members", uid), { role });
  },

  /** Join langsung — dipakai untuk joinMethod 'public' dan 'link'. */
  async joinDirect(groupId: string, user: { uid: string; name: string; photoURL: string | null }) {
    await GroupService.addMember(groupId, user, "member");
  },

  async joinWithCode(groupId: string, code: string, user: { uid: string; name: string; photoURL: string | null }): Promise<boolean> {
    const group = await GroupService.get(groupId);
    if (!group || group.inviteCode !== code.trim().toUpperCase()) return false;
    await GroupService.addMember(groupId, user, "member");
    return true;
  },

  async requestToJoin(groupId: string, user: { uid: string; name: string; photoURL: string | null }) {
    await setDoc(doc(db, "groups", groupId, "joinRequests", user.uid), {
      name: user.name,
      photoURL: user.photoURL,
      requestedAt: serverTimestamp(),
    });
  },

  subscribeJoinRequests(groupId: string, cb: (requests: JoinRequest[]) => void) {
    return onSnapshot(collection(db, "groups", groupId, "joinRequests"), (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return { uid: d.id, name: data.name, photoURL: data.photoURL ?? null, requestedAt: toMillis(data.requestedAt) };
        })
      );
    });
  },

  async approveJoinRequest(groupId: string, req: JoinRequest) {
    await GroupService.addMember(groupId, req, "member");
    await deleteDoc(doc(db, "groups", groupId, "joinRequests", req.uid));
  },

  async rejectJoinRequest(groupId: string, uid: string) {
    await deleteDoc(doc(db, "groups", groupId, "joinRequests", uid));
  },

  // --- Channels ---

  subscribeChannels(groupId: string, cb: (channels: Channel[]) => void) {
    const q = query(collection(db, "groups", groupId, "channels"), orderBy("order", "asc"));
    return onSnapshot(q, (snap) => {
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          type: d.data().type === "voice" ? "voice" : "text",
          order: d.data().order ?? 0,
          createdAt: toMillis(d.data().createdAt),
        }))
      );
    });
  },

  async addChannel(groupId: string, name: string, order: number, type: ChannelType = "text") {
    await addDoc(collection(db, "groups", groupId, "channels"), {
      name: name.trim().toLowerCase().replace(/\s+/g, "-") || "channel-baru",
      type,
      order,
      createdAt: serverTimestamp(),
    });
  },

  async deleteChannel(groupId: string, channelId: string) {
    await deleteDoc(doc(db, "groups", groupId, "channels", channelId));
  },

  // --- Messages ---

  subscribeMessages(groupId: string, channelId: string, cb: (messages: GroupMessage[]) => void) {
    const q = query(collection(db, "groups", groupId, "channels", channelId, "messages"), orderBy("createdAt", "asc"));
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
            pinned: Boolean(data.pinned),
            edited: Boolean(data.edited),
            attachment: data.attachment ?? null,
            flaggedByAI: Boolean(data.flaggedByAI),
            flaggedReason: data.flaggedReason ?? "",
            createdAt: toMillis(data.createdAt),
          };
        })
      );
    });
  },

  async sendMessage(
    groupId: string,
    channelId: string,
    author: { uid: string; name: string; photoURL: string | null },
    text: string
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await addDoc(collection(db, "groups", groupId, "channels", channelId, "messages"), {
      userId: author.uid,
      userName: author.name,
      userPhotoURL: author.photoURL,
      text: trimmed,
      pinned: false,
      edited: false,
      attachment: null,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "groups", groupId), { lastMessageAt: serverTimestamp() });
    // Pengirim otomatis dianggap sudah "membaca" pesannya sendiri, supaya
    // grup itu tidak keliru muncul sebagai belum-dibaca di badge sidebar.
    await GroupService.markRead(groupId, author.uid);
  },

  async sendFileMessage(
    groupId: string,
    channelId: string,
    author: { uid: string; name: string; photoURL: string | null },
    attachment: MessageAttachment,
    caption: string
  ) {
    await addDoc(collection(db, "groups", groupId, "channels", channelId, "messages"), {
      userId: author.uid,
      userName: author.name,
      userPhotoURL: author.photoURL,
      text: caption.trim(),
      pinned: false,
      edited: false,
      attachment,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "groups", groupId), { lastMessageAt: serverTimestamp() });
    await GroupService.markRead(groupId, author.uid);
  },

  async editMessage(groupId: string, channelId: string, messageId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await updateDoc(doc(db, "groups", groupId, "channels", channelId, "messages", messageId), {
      text: trimmed,
      edited: true,
    });
  },

  async togglePinMessage(groupId: string, channelId: string, messageId: string, pinned: boolean) {
    await updateDoc(doc(db, "groups", groupId, "channels", channelId, "messages", messageId), { pinned: !pinned });
  },

  async deleteMessage(groupId: string, channelId: string, messageId: string) {
    await deleteDoc(doc(db, "groups", groupId, "channels", channelId, "messages", messageId));
  },

  // --- Baca/belum-baca (notifikasi ringan) ---

  async markRead(groupId: string, uid: string) {
    await updateDoc(doc(db, "groups", groupId, "members", uid), { lastReadAt: serverTimestamp() });
  },

  /**
   * Hitung berapa grup (dari yang diikuti user) punya pesan baru sejak
   * terakhir dibuka. Query on-demand (bukan realtime) — dipanggil ulang
   * tiap kali Sidebar mendeteksi perpindahan halaman, lihat lib/notifications.ts.
   */
  async countUnread(uid: string): Promise<number> {
    const q = query(collectionGroup(db, "members"), where("uid", "==", uid));
    const snap = await getDocs(q);
    let unread = 0;
    await Promise.all(
      snap.docs.map(async (memberDoc) => {
        const groupId = memberDoc.ref.parent.parent?.id;
        if (!groupId) return;
        const lastReadAt = memberDoc.data().lastReadAt ? toMillis(memberDoc.data().lastReadAt) : 0;
        const group = await GroupService.get(groupId);
        if (group && group.lastMessageAt > lastReadAt) unread += 1;
      })
    );
    return unread;
  },
};
