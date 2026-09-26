import { doc, deleteDoc, getDoc, getDocs, collection, query, where, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Disimpan sebagai satu koleksi datar `follows/{followerUid_followingUid}`
 * — bukan subkoleksi di bawah users — supaya gampang query dua arah
 * ("siapa yang aku ikuti" dan "siapa yang mengikuti aku") tanpa
 * collectionGroup.
 */
function followDocId(followerUid: string, followingUid: string) {
  return `${followerUid}_${followingUid}`;
}

export const FollowService = {
  async isFollowing(followerUid: string, followingUid: string): Promise<boolean> {
    const snap = await getDoc(doc(db, "follows", followDocId(followerUid, followingUid)));
    return snap.exists();
  },

  async follow(followerUid: string, followingUid: string) {
    if (followerUid === followingUid) return;
    await setDoc(doc(db, "follows", followDocId(followerUid, followingUid)), {
      followerUid,
      followingUid,
      createdAt: serverTimestamp(),
    });
  },

  async unfollow(followerUid: string, followingUid: string) {
    await deleteDoc(doc(db, "follows", followDocId(followerUid, followingUid)));
  },

  async listFollowing(uid: string): Promise<string[]> {
    const q = query(collection(db, "follows"), where("followerUid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().followingUid as string);
  },

  async countFollowers(uid: string): Promise<number> {
    const q = query(collection(db, "follows"), where("followingUid", "==", uid));
    const snap = await getDocs(q);
    return snap.size;
  },

  async countFollowing(uid: string): Promise<number> {
    const q = query(collection(db, "follows"), where("followerUid", "==", uid));
    const snap = await getDocs(q);
    return snap.size;
  },
};
