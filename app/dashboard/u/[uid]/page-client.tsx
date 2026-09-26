"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useUserProfile } from "@/lib/useUserProfile";
import { UserService, type UserProfile } from "@/lib/users";
import { FollowService } from "@/lib/follows";
import { PostService, type Post } from "@/lib/posts";
import {
  profileCategoryLabel,
  themeColorHex,
  followerMilestoneBadge,
} from "@/lib/profileOptions";

const OCCUPATION_LABEL: Record<string, string> = {
  "software-engineer": "Software Engineer",
  "web-development": "Web Development",
  design: "Design",
};

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

function lastActiveLabel(ms: number) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 5) return "baru saja online";
  if (min < 60) return `terakhir online ${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `terakhir online ${hr} jam lalu`;
  return `terakhir online ${Math.floor(hr / 24)} hari lalu`;
}

export default function PublicProfilePage() {
  const params = useParams<{ uid: string }>();
  const uid = params.uid;
  const { user } = useAuth();
  const { profile: viewerProfile } = useUserProfile();

  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    UserService.get(uid).then(setProfile);
    PostService.listByAuthor(uid).then(setPosts);
    FollowService.countFollowers(uid).then(setFollowerCount);
    FollowService.countFollowing(uid).then(setFollowingCount);
  }, [uid]);

  useEffect(() => {
    if (!user || user.uid === uid) return;
    FollowService.isFollowing(user.uid, uid).then(setFollowing);
  }, [user, uid]);

  async function handleToggleFollow() {
    if (!user) return;
    if (following) {
      await FollowService.unfollow(user.uid, uid);
      setFollowing(false);
      setFollowerCount((c) => c - 1);
    } else {
      await FollowService.follow(user.uid, uid);
      setFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  }

  if (profile === undefined) return <p className="p-8 font-mono text-sm text-paper-faint">Memuat...</p>;
  if (profile === null) return <p className="p-8 text-sm text-paper-dim">Pengguna tidak ditemukan.</p>;

  const isSelf = user?.uid === uid;
  const isAdminViewer = viewerProfile?.role === "admin";
  const canViewFull =
    isSelf || isAdminViewer || profile.visibility === "public" || (profile.visibility === "followers" && following);

  const accent = themeColorHex(profile.themeColor);
  const milestoneBadge = followerMilestoneBadge(followerCount);
  const pinnedPost = posts.find((p) => p.id === profile.pinnedPostId);
  const highlightPosts = profile.highlightPostIds
    .map((id) => posts.find((p) => p.id === id))
    .filter((p): p is Post => Boolean(p));
  const restOfPosts = posts.filter((p) => p.id !== profile.pinnedPostId);

  return (
    <div className="mx-auto max-w-2xl">
      {profile.bannerURL && (
        <div className="h-32 w-full overflow-hidden rounded-card border border-ink-line sm:h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.bannerURL} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className={`flex items-start gap-4 ${profile.bannerURL ? "-mt-8 px-2" : "mt-0"}`}>
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border-4 border-ink bg-ink-surface text-2xl font-semibold text-amber-soft ${
            profile.avatarShape === "square" ? "rounded-md" : "rounded-full"
          }`}
        >
          {profile.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-2xl font-semibold text-paper">{profile.name}</h1>
                {profile.verified && (
                  <span title="Terverifikasi" style={{ color: accent }}>
                    ✓
                  </span>
                )}
              </div>
              {profile.username && <p className="font-mono text-sm text-amber-soft">@{profile.username}</p>}
            </div>
            {!isSelf && user && (
              <div className="flex shrink-0 gap-2">
                {profile.whatsapp && canViewFull && (
                  <a
                    href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-ink-line px-4 py-2 text-sm text-mint hover:border-mint"
                  >
                    Chat WA
                  </a>
                )}
                <button
                  onClick={handleToggleFollow}
                  className="rounded-md border px-4 py-2 text-sm font-medium"
                  style={
                    following
                      ? { borderColor: "#2E2E3A", color: "#B9B6C4" }
                      : { borderColor: accent, backgroundColor: `${accent}1A`, color: accent }
                  }
                >
                  {following ? "Mengikuti" : "Ikuti"}
                </button>
              </div>
            )}
          </div>

          {(profile.badge || milestoneBadge) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.badge && (
                <span className="rounded-md bg-amber/10 px-2.5 py-1 font-mono text-xs text-amber-soft">
                  {profile.badge}
                </span>
              )}
              {milestoneBadge && (
                <span className="rounded-md bg-mint/10 px-2.5 py-1 font-mono text-xs text-mint">{milestoneBadge}</span>
              )}
            </div>
          )}

          {profile.bio && <p className="mt-2 text-sm text-paper-dim">{profile.bio}</p>}

          {profile.occupation && (
            <p className="mt-1 text-xs text-paper-faint">
              {profile.occupation === "other" ? profile.occupationOther : OCCUPATION_LABEL[profile.occupation]}
            </p>
          )}
          {profile.profileCategory && (
            <p className="mt-1 text-xs text-paper-faint">{profileCategoryLabel(profile.profileCategory)}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-paper-faint">
            {profile.location && !profile.hideLocation && <span>📍 {profile.location}</span>}
            {profile.websiteUrl && (
              <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-amber-soft">
                🔗 {profile.websiteUrl}
              </a>
            )}
            {profile.contactEmail && !profile.hideContactEmail && <span>✉️ {profile.contactEmail}</span>}
            {!profile.hideLastActive && profile.lastActiveAt > 0 && <span>{lastActiveLabel(profile.lastActiveAt)}</span>}
          </div>

          {profile.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-ink-line px-2.5 py-1 text-xs text-paper-dim hover:border-amber hover:text-amber-soft"
                >
                  {l.label}
                </a>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-4 font-mono text-xs text-paper-faint">
            <span>
              <span className="text-paper">{followerCount}</span> pengikut
            </span>
            <span>
              <span className="text-paper">{followingCount}</span> mengikuti
            </span>
          </div>
        </div>
      </div>

      {!canViewFull ? (
        <div className="mt-10 rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
          <p className="text-sm text-paper-dim">
            {profile.visibility === "private"
              ? "Akun ini privat. Cuma pemiliknya yang bisa lihat isi profil."
              : "Akun ini cuma bisa dilihat pengikutnya. Ikuti dulu untuk lihat postingan & detail profil."}
          </p>
        </div>
      ) : (
        <>
          {highlightPosts.length > 0 && (
            <div className="mt-8">
              <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Highlight</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {highlightPosts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/postingan/${p.id}`}
                    className="shrink-0 rounded-md border border-ink-line bg-ink-soft px-3 py-2 text-xs text-paper-dim hover:border-paper-dim"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <p className="font-display text-lg font-semibold text-paper">Postingan ({posts.length})</p>
            <div className="mt-4 space-y-3">
              {posts.length === 0 && <p className="text-sm text-paper-faint">Belum ada postingan.</p>}
              {pinnedPost && (
                <Link
                  href={`/dashboard/postingan/${pinnedPost.id}`}
                  className="block rounded-card p-4 transition-colors hover:border-paper-dim"
                  style={{ border: `1px solid ${accent}66`, backgroundColor: `${accent}0D` }}
                >
                  <p className="font-mono text-[11px]" style={{ color: accent }}>
                    📌 Disematkan
                  </p>
                  <p className="mt-1 font-display text-sm font-semibold text-paper">{pinnedPost.title}</p>
                  <p className="mt-1 font-mono text-xs text-paper-faint">
                    ▲ {pinnedPost.score} · 💬 {pinnedPost.commentsCount}
                  </p>
                </Link>
              )}
              {restOfPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/dashboard/postingan/${post.id}`}
                  className="block rounded-card border border-ink-line bg-ink-soft p-4 transition-colors hover:border-paper-dim"
                >
                  <p className="font-display text-sm font-semibold text-paper">{post.title}</p>
                  <p className="mt-1 font-mono text-xs text-paper-faint">
                    ▲ {post.score} · 💬 {post.commentsCount}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
