"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import {
  GroupService,
  type Group,
  type Member,
  type Channel,
  type ChannelType,
  type GroupMessage,
  type JoinRequest,
  type MemberRole,
} from "@/lib/groups";
import JoinGate from "./_components/JoinGate";
import ChannelList from "./_components/ChannelList";
import MemberPanel from "./_components/MemberPanel";
import MessageList from "./_components/MessageList";
import VoiceChannel from "./_components/VoiceChannel";
import ReportButton from "@/components/ReportButton";
import { uploadGroupFile } from "@/lib/fileUpload";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [me, setMe] = useState<Member | null | undefined>(undefined); // undefined = belum dicek
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const unsub = GroupService.subscribe(groupId, setGroup);
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!user) return;
    GroupService.isMember(groupId, user.uid).then(setMe);
  }, [groupId, user]);

  const isMember = Boolean(me);
  const canManage = me?.role === "owner" || me?.role === "admin";

  // Tandai grup ini sudah dibaca begitu member membukanya (dipakai badge
  // notifikasi belum-dibaca di sidebar).
  useEffect(() => {
    if (!user || !isMember) return;
    GroupService.markRead(groupId, user.uid);
  }, [groupId, user, isMember]);

  useEffect(() => {
    if (!isMember) return;
    const unsub = GroupService.subscribeMembers(groupId, setMembers);
    return unsub;
  }, [groupId, isMember]);

  useEffect(() => {
    if (!isMember || !canManage) return;
    const unsub = GroupService.subscribeJoinRequests(groupId, setJoinRequests);
    return unsub;
  }, [groupId, isMember, canManage]);

  useEffect(() => {
    if (!isMember) return;
    const unsub = GroupService.subscribeChannels(groupId, (list) => {
      setChannels(list);
      setActiveChannelId((current) => current ?? list[0]?.id ?? null);
    });
    return unsub;
  }, [groupId, isMember]);

  useEffect(() => {
    if (!isMember || !activeChannelId) return;
    const unsub = GroupService.subscribeMessages(groupId, activeChannelId, setMessages);
    return unsub;
  }, [groupId, isMember, activeChannelId]);

  const authorInfo = useMemo(
    () => (user ? { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL } : null),
    [user]
  );

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  async function handleJoinDirect() {
    if (!authorInfo) return;
    await GroupService.joinDirect(groupId, authorInfo);
    setMe(await GroupService.isMember(groupId, authorInfo.uid));
  }

  async function handleJoinWithCode(code: string): Promise<boolean> {
    if (!authorInfo) return false;
    const ok = await GroupService.joinWithCode(groupId, code, authorInfo);
    if (ok) setMe(await GroupService.isMember(groupId, authorInfo.uid));
    return ok;
  }

  async function handleRequestJoin() {
    if (!authorInfo) return;
    await GroupService.requestToJoin(groupId, authorInfo);
    setRequested(true);
  }

  async function handleSetRole(uid: string, role: MemberRole) {
    await GroupService.setMemberRole(groupId, uid, role);
  }

  async function handleRemoveMember(uid: string) {
    await GroupService.removeMember(groupId, uid);
  }

  async function handleApprove(req: JoinRequest) {
    await GroupService.approveJoinRequest(groupId, req);
  }

  async function handleReject(uid: string) {
    await GroupService.rejectJoinRequest(groupId, uid);
  }

  async function handleAddChannel(name: string, type: ChannelType) {
    const maxOrder = channels.length ? Math.max(...channels.map((c) => c.order)) : -1;
    await GroupService.addChannel(groupId, name, maxOrder + 1, type);
  }

  async function handleDeleteChannel(id: string) {
    await GroupService.deleteChannel(groupId, id);
    if (activeChannelId === id) setActiveChannelId(null);
  }

  async function handleSend(text: string) {
    if (!authorInfo || !activeChannelId) return;
    await GroupService.sendMessage(groupId, activeChannelId, authorInfo, text);
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    if (!activeChannelId) return;
    await GroupService.togglePinMessage(groupId, activeChannelId, id, pinned);
  }

  async function handleDeleteMessage(id: string) {
    if (!activeChannelId) return;
    await GroupService.deleteMessage(groupId, activeChannelId, id);
  }

  async function handleEditMessage(id: string, text: string) {
    if (!activeChannelId) return;
    await GroupService.editMessage(groupId, activeChannelId, id, text);
  }

  async function handleSendFile(file: File, onProgress: (pct: number) => void) {
    if (!authorInfo || !activeChannelId) return;
    const attachment = await uploadGroupFile(groupId, activeChannelId, authorInfo.uid, file, onProgress);
    await GroupService.sendFileMessage(groupId, activeChannelId, authorInfo, attachment, "");
  }

  if (group === undefined || me === undefined) {
    return <p className="p-8 font-mono text-sm text-paper-faint">Memuat grup...</p>;
  }
  if (group === null) {
    return <p className="p-8 text-sm text-paper-dim">Grup tidak ditemukan.</p>;
  }

  if (!isMember) {
    return (
      <div className="-mx-6 -my-8 h-screen sm:-mx-10">
        <JoinGate
          group={group}
          onJoinDirect={handleJoinDirect}
          onJoinWithCode={handleJoinWithCode}
          onRequestJoin={handleRequestJoin}
          requested={requested}
        />
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-8 flex h-screen sm:-mx-10">
      <aside className="w-56 shrink-0 border-r border-ink-line bg-ink-soft/40 px-3 py-5">
        <p className="truncate px-2 font-display text-sm font-semibold text-paper">{group.name}</p>
        {group.joinMethod === "code" && canManage && group.inviteCode && (
          <p className="mt-1 px-2 font-mono text-[11px] text-paper-faint">
            Kode: <span className="text-amber-soft">{group.inviteCode}</span>
          </p>
        )}
        <div className="mt-4">
          <ChannelList
            channels={channels}
            activeId={activeChannelId}
            canManage={canManage}
            onSelect={setActiveChannelId}
            onAdd={handleAddChannel}
            onDelete={handleDeleteChannel}
          />
        </div>
        <button
          onClick={() => setShowMembers((v) => !v)}
          className="mt-6 w-full rounded-md border border-ink-line px-2 py-1.5 text-xs text-paper-dim hover:border-paper-dim"
        >
          ◎ {group.memberCount} anggota
        </button>
        {me?.role === "member" && (
          <div className="mt-2 text-center">
            <ReportButton
              targetType="group"
              targetId={group.id}
              targetLabel={group.name}
              targetHref={`/dashboard/grup/${group.id}`}
            />
          </div>
        )}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-ink-line bg-ink-soft/50 px-4 py-3">
          <p className="font-mono text-sm text-paper">
            {activeChannel?.type === "voice" ? "🔊" : "#"} {activeChannel?.name}
          </p>
        </div>
        {!activeChannelId || !activeChannel ? (
          <div className="flex flex-1 items-center justify-center text-sm text-paper-dim">
            Belum ada channel.
          </div>
        ) : activeChannel.type === "voice" ? (
          <VoiceChannel groupId={groupId} channelId={activeChannelId} channelName={activeChannel.name} />
        ) : (
          <MessageList
            messages={messages}
            currentUid={user!.uid}
            canModerate={canManage}
            groupId={groupId}
            onTogglePin={handleTogglePin}
            onDelete={handleDeleteMessage}
            onSend={handleSend}
            onEdit={handleEditMessage}
            onSendFile={handleSendFile}
          />
        )}
      </div>

      {showMembers && (
        <MemberPanel
          members={members}
          joinRequests={joinRequests}
          currentUid={user!.uid}
          canManage={canManage}
          onSetRole={handleSetRole}
          onRemove={handleRemoveMember}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
