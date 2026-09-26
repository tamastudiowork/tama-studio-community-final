"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useUserProfile } from "@/lib/useUserProfile";
import { profileCategoryLabel, themeColorHex, visibilityLabel, followerMilestoneBadge } from "@/lib/profileOptions";
import { useEffect, useState } from "react";
import { FollowService } from "@/lib/follows";

const OCCUPATION_LABEL: Record<string, string> = {
  "software-engineer": "Software Engineer",
  "web-development": "Web Development",
  design: "Design",
};

export default function ProfilPage() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile();
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    FollowService.countFollowers(user.uid).then(setFollowerCount);
  }, [user]);

  const accent = profile ? themeColorHex(profile.themeColor) : themeColorHex("amber");
  const milestoneBadge = followerCount ? followerMilestoneBadge(followerCount) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Profil</p>
        <Link
          href="/dashboard/profil/edit"
          className="rounded-md border border-ink-line px-3 py-1.5 text-xs text-paper-dim hover:border-amber hover:text-amber-soft"
        >
          Edit profil
        </Link>
      </div>

      {profile?.bannerURL && (
        <div className="mt-3 h-28 w-full overflow-hidden rounded-card border border-ink-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.bannerURL} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {user && (
        <Link href={`/dashboard/u/${user.uid}`} className="mt-2 inline-block text-xs text-paper-faint hover:text-amber-soft">
          Lihat sebagai profil publik →
        </Link>
      )}

      <div className="mt-4 flex items-center gap-4">
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-ink-surface text-2xl font-semibold text-amber-soft ${
            profile?.avatarShape === "square" ? "rounded-md" : "rounded-full"
          }`}
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            (user?.displayName || "?").charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
              {user?.displayName || "Pengguna"}
            </h1>
            {profile?.verified && (
              <span title="Terverifikasi" className="text-base" style={{ color: accent }}>
                ✓
              </span>
            )}
          </div>
          {profile?.username && <p className="font-mono text-sm text-amber-soft">@{profile.username}</p>}
          <p className="text-sm text-paper-dim">{user?.email}</p>
        </div>
      </div>

      {(profile?.badge || milestoneBadge) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile?.badge && (
            <span className="rounded-md bg-amber/10 px-2.5 py-1 font-mono text-xs text-amber-soft">{profile.badge}</span>
          )}
          {milestoneBadge && (
            <span className="rounded-md bg-mint/10 px-2.5 py-1 font-mono text-xs text-mint">{milestoneBadge}</span>
          )}
        </div>
      )}

      {!loading && profile && (
        <div className="mt-8 space-y-5">
          {profile.bio && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Tentang</p>
              <p className="mt-1 text-sm text-paper-dim">{profile.bio}</p>
            </div>
          )}

          {(profile.location || profile.websiteUrl || profile.whatsapp || profile.contactEmail) && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Kontak</p>
              <div className="mt-1 space-y-1 text-sm text-paper-dim">
                {profile.location && !profile.hideLocation && <p>📍 {profile.location}</p>}
                {profile.websiteUrl && (
                  <p>
                    🔗{" "}
                    <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-amber-soft">
                      {profile.websiteUrl}
                    </a>
                  </p>
                )}
                {profile.contactEmail && !profile.hideContactEmail && <p>✉️ {profile.contactEmail}</p>}
                {profile.whatsapp && <p>💬 {profile.whatsapp}</p>}
              </div>
            </div>
          )}

          {profile.links.length > 0 && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Link lainnya</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
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
            </div>
          )}

          {profile.profileCategory && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Kategori profil</p>
              <p className="mt-1 text-sm text-paper-dim">{profileCategoryLabel(profile.profileCategory)}</p>
            </div>
          )}

          {profile.occupation && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Pekerjaan</p>
              <p className="mt-1 text-sm text-paper-dim">
                {profile.occupation === "other" ? profile.occupationOther : OCCUPATION_LABEL[profile.occupation]}
              </p>
            </div>
          )}

          {profile.purpose && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Tujuan gabung TSC</p>
              <p className="mt-1 text-sm text-paper-dim">{profile.purpose}</p>
            </div>
          )}

          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Privasi akun</p>
            <p className="mt-1 text-sm text-paper-dim">{visibilityLabel(profile.visibility)}</p>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Firebase project sendiri</p>
            <p className="mt-1 text-sm text-paper-dim">
              {profile.personalFirebaseConfig
                ? `Terhubung — project "${profile.personalFirebaseConfig.projectId}"`
                : "Belum diisi (opsional)"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
