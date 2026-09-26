"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onSnapshot, addDoc, setDoc, updateDoc, DocumentData } from "firebase/firestore";
import { useAuth } from "@/lib/useAuth";
import { VoiceService, type VoiceParticipant } from "@/lib/voice";

// Cuma STUN publik gratis dari Google — TIDAK ada server TURN.
// Ini cukup buat kebanyakan jaringan rumahan/kantor biasa, tapi BISA GAGAL
// tersambung di jaringan dengan NAT simetris/firewall ketat (banyak
// jaringan korporat/kampus begitu). Solusi sebenarnya butuh server TURN
// (layanan berbayar seperti Twilio Network Traversal, atau self-host
// pakai coturn) — di luar scope yang bisa disediakan tanpa akun/infra
// tambahan milik kamu sendiri. Kalau voice sering gagal tersambung untuk
// sebagian anggota, ini penyebabnya, tambahkan iceServers TURN di bawah.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type PeerEntry = {
  connection: RTCPeerConnection;
  stream: MediaStream;
  unsubscribers: (() => void)[];
};

export default function VoiceChannel({
  groupId,
  channelId,
  channelName,
}: {
  groupId: string;
  channelId: string;
  channelName: string;
}) {
  const { user } = useAuth();
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, PeerEntry>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const closePeer = useCallback((uid: string) => {
    const entry = peersRef.current[uid];
    if (!entry) return;
    entry.unsubscribers.forEach((u) => u());
    entry.connection.close();
    delete peersRef.current[uid];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (remoteUid: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const remoteStream = new MediaStream();

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
        setRemoteStreams((prev) => ({ ...prev, [remoteUid]: remoteStream }));
      };

      peersRef.current[remoteUid] = { connection: pc, stream: remoteStream, unsubscribers: [] };
      return pc;
    },
    []
  );

  const startAsCaller = useCallback(
    async (remoteUid: string) => {
      if (!user || peersRef.current[remoteUid]) return;
      const pc = createPeerConnection(remoteUid);
      const callRef = VoiceService.callDocRef(groupId, channelId, user.uid, remoteUid);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(
            VoiceService.candidatesCol(groupId, channelId, user.uid, remoteUid, "caller"),
            event.candidate.toJSON()
          );
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(callRef, { offer: { type: offer.type, sdp: offer.sdp }, from: user.uid, to: remoteUid });

      const unsubCall = onSnapshot(callRef, async (snap) => {
        const data = snap.data() as DocumentData | undefined;
        if (data?.answer && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      const unsubCandidates = onSnapshot(
        VoiceService.candidatesCol(groupId, channelId, user.uid, remoteUid, "callee"),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
            }
          });
        }
      );

      (peersRef.current[remoteUid] as PeerEntry).unsubscribers.push(unsubCall, unsubCandidates);
    },
    [createPeerConnection, groupId, channelId, user]
  );

  const startAsCallee = useCallback(
    async (remoteUid: string) => {
      if (!user || peersRef.current[remoteUid]) return;
      const callRef = VoiceService.callDocRef(groupId, channelId, remoteUid, user.uid);

      const unsubCall = onSnapshot(callRef, async (snap) => {
        const data = snap.data() as DocumentData | undefined;
        if (!data?.offer || peersRef.current[remoteUid]) return;

        const pc = createPeerConnection(remoteUid);
        (peersRef.current[remoteUid] as PeerEntry).unsubscribers.push(unsubCall);
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(
              VoiceService.candidatesCol(groupId, channelId, remoteUid, user.uid, "callee"),
              event.candidate.toJSON()
            );
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp } });

        const unsubCandidates = onSnapshot(
          VoiceService.candidatesCol(groupId, channelId, remoteUid, user.uid, "caller"),
          (snap2) => {
            snap2.docChanges().forEach((change) => {
              if (change.type === "added") {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
              }
            });
          }
        );
        (peersRef.current[remoteUid] as PeerEntry).unsubscribers.push(unsubCandidates);
      });
    },
    [createPeerConnection, groupId, channelId, user]
  );

  // Subscribe daftar partisipan setiap kali komponen mount (bukan hanya
  // saat joined) supaya orang yang belum join tetap lihat siapa yang
  // sedang ada di voice channel ini.
  useEffect(() => {
    const unsub = VoiceService.subscribeParticipants(groupId, channelId, setParticipants);
    return unsub;
  }, [groupId, channelId]);

  // Kelola koneksi peer berdasar daftar partisipan — cuma jalan kalau
  // kita sendiri sudah join.
  useEffect(() => {
    if (!joined || !user) return;

    const others = participants.filter((p) => p.uid !== user.uid);
    const currentUids = new Set(others.map((p) => p.uid));

    // Tutup koneksi ke orang yang sudah keluar.
    Object.keys(peersRef.current).forEach((uid) => {
      if (!currentUids.has(uid)) closePeer(uid);
    });

    // Buka koneksi baru — deterministik: uid lebih kecil selalu jadi
    // "penelepon" supaya kedua sisi tidak sama-sama membuat offer.
    others.forEach((p) => {
      if (peersRef.current[p.uid]) return;
      if (user.uid < p.uid) startAsCaller(p.uid);
      else startAsCallee(p.uid);
    });
  }, [participants, joined, user, closePeer, startAsCaller, startAsCallee]);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([uid, stream]) => {
      const el = audioRefs.current[uid];
      if (el && el.srcObject !== stream) el.srcObject = stream;
    });
  }, [remoteStreams]);

  async function handleJoin() {
    if (!user) return;
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      await VoiceService.join(groupId, channelId, {
        uid: user.uid,
        name: user.displayName || user.email || "Anonim",
        photoURL: user.photoURL,
      });
      setJoined(true);
    } catch (err) {
      setMicError(
        "Tidak bisa akses mikrofon. Cek izin mikrofon di browser kamu untuk situs ini."
      );
    }
  }

  async function handleLeave() {
    if (!user) return;
    Object.keys(peersRef.current).forEach(closePeer);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    await VoiceService.leave(groupId, channelId, user.uid);
    setJoined(false);
  }

  // Auto-leave saat pindah channel/keluar halaman.
  useEffect(() => {
    return () => {
      if (joined && user) {
        Object.keys(peersRef.current).forEach(closePeer);
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        VoiceService.leave(groupId, channelId, user.uid);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, channelId]);

  function handleToggleMute() {
    if (!user || !localStreamRef.current) return;
    const next = !muted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    VoiceService.setMuted(groupId, channelId, user.uid, next);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <p className="font-mono text-sm text-paper-faint">🔊 {channelName}</p>
      <p className="mt-1 text-xs text-paper-faint">
        Voice pakai koneksi langsung antar-browser (WebRTC) — cuma STUN publik, tanpa server TURN.
        Bisa gagal tersambung di sebagian jaringan kantor/kampus yang ketat.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {participants.length === 0 && (
          <p className="text-sm text-paper-dim">Belum ada yang di channel ini.</p>
        )}
        {participants.map((p) => (
          <div key={p.uid} className="flex flex-col items-center gap-1.5">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-ink-surface text-sm font-semibold text-amber-soft">
              {p.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                p.name.charAt(0).toUpperCase()
              )}
            </div>
            <p className="max-w-[80px] truncate text-xs text-paper-dim">{p.name}</p>
            {p.muted && <span className="text-[10px] text-paper-faint">🔇 dibisukan</span>}
          </div>
        ))}
      </div>

      {micError && <p className="mt-4 text-sm text-[#F45D5D]">{micError}</p>}

      <div className="mt-8 flex gap-3">
        {!joined ? (
          <button
            onClick={handleJoin}
            className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow"
          >
            Gabung suara
          </button>
        ) : (
          <>
            <button
              onClick={handleToggleMute}
              className={`rounded-md border px-4 py-2.5 text-sm font-medium ${
                muted ? "border-amber bg-amber/10 text-amber-soft" : "border-ink-line text-paper-dim"
              }`}
            >
              {muted ? "🔇 Bisu" : "🎙 Aktif"}
            </button>
            <button
              onClick={handleLeave}
              className="rounded-md border border-[#F45D5D]/40 px-4 py-2.5 text-sm text-[#F45D5D]"
            >
              Keluar
            </button>
          </>
        )}
      </div>

      {Object.entries(remoteStreams).map(([uid]) => (
        <audio
          key={uid}
          ref={(el) => {
            audioRefs.current[uid] = el;
          }}
          autoPlay
        />
      ))}
    </div>
  );
}
