"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/lib/useAuth";
import { useUserProfile } from "@/lib/useUserProfile";
import { UserService, type AvatarShape, type ProfileLink } from "@/lib/users";
import { uploadAvatar, uploadBanner } from "@/lib/fileUpload";
import { PostService, type Post } from "@/lib/posts";
import {
  PROFILE_CATEGORIES,
  THEME_COLORS,
  VISIBILITY_OPTIONS,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MAX_MULTI_LINKS,
  MAX_HIGHLIGHTS,
  followerMilestoneBadge,
} from "@/lib/profileOptions";
import { FollowService } from "@/lib/follows";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">{children}</p>;
}

const inputClass =
  "w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber";

function newLinkId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function EditProfilPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // 1. Identitas dasar
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarShape, setAvatarShape] = useState<AvatarShape>("circle");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  // 2. Link & kontak
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [hideContactEmail, setHideContactEmail] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");

  // 3. Kategori & lokasi (verifikasi ditampilkan read-only, lihat di bawah)
  const [profileCategory, setProfileCategory] = useState("");
  const [location, setLocation] = useState("");

  // 4. Kustomisasi & privasi
  const [themeColor, setThemeColor] = useState("amber");
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("public");
  const [hideLocation, setHideLocation] = useState(false);
  const [hideLastActive, setHideLastActive] = useState(false);

  // 5. Pin / Highlight
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);
  const [highlightPostIds, setHighlightPostIds] = useState<string[]>([]);

  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!profileLoading && !user) router.push("/login");
  }, [profileLoading, user, router]);

  // Isi form sekali dari profil yang sudah kesimpan — pakai flag `hydrated`
  // supaya snapshot Firestore yang masuk belakangan (mis. gara-gara tab
  // lain) tidak diam-diam menimpa apa yang lagi diketik pengguna di form ini.
  useEffect(() => {
    if (hydrated || !profile) return;
    setPhotoPreview(profile.photoURL);
    setBannerPreview(profile.bannerURL);
    setAvatarShape(profile.avatarShape);
    setName(profile.name || "");
    setBio(profile.bio || "");
    setWebsiteUrl(profile.websiteUrl || "");
    setLinks(profile.links || []);
    setContactEmail(profile.contactEmail || "");
    setHideContactEmail(profile.hideContactEmail);
    setWhatsapp(profile.whatsapp || "");
    setProfileCategory(profile.profileCategory || "");
    setLocation(profile.location || "");
    setThemeColor(profile.themeColor || "amber");
    setVisibility(profile.visibility || "public");
    setHideLocation(profile.hideLocation);
    setHideLastActive(profile.hideLastActive);
    setPinnedPostId(profile.pinnedPostId);
    setHighlightPostIds(profile.highlightPostIds || []);
    setHydrated(true);
  }, [profile, hydrated]);

  useEffect(() => {
    if (!user) return;
    PostService.listByAuthor(user.uid).then(setMyPosts);
    FollowService.countFollowers(user.uid).then(setFollowerCount);
  }, [user]);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleBannerChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  function addLink() {
    if (links.length >= MAX_MULTI_LINKS) return;
    setLinks((prev) => [...prev, { id: newLinkId(), label: "", url: "" }]);
  }

  function updateLink(id: string, patch: Partial<ProfileLink>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function toggleHighlight(postId: string) {
    setHighlightPostIds((prev) => {
      if (prev.includes(postId)) return prev.filter((id) => id !== postId);
      if (prev.length >= MAX_HIGHLIGHTS) return prev;
      return [...prev, postId];
    });
  }

  async function handleSubmit() {
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < DISPLAY_NAME_MIN_LENGTH || trimmedName.length > DISPLAY_NAME_MAX_LENGTH) {
      setError(`Nama tampilan harus ${DISPLAY_NAME_MIN_LENGTH}-${DISPLAY_NAME_MAX_LENGTH} karakter.`);
      return;
    }
    if (bio.length > BIO_MAX_LENGTH) {
      setError(`Bio maksimal ${BIO_MAX_LENGTH} karakter.`);
      return;
    }
    const cleanedLinks = links.map((l) => ({ ...l, label: l.label.trim(), url: l.url.trim() })).filter(
      (l) => l.label && l.url
    );
    if (!user) return;

    setSaving(true);
    try {
      let photoURL = profile?.photoURL ?? null;
      if (photoFile) {
        photoURL = await uploadAvatar(user.uid, photoFile);
        await updateProfile(user, { photoURL });
      }
      if (trimmedName !== user.displayName) {
        await updateProfile(user, { displayName: trimmedName });
      }

      let bannerURL = profile?.bannerURL ?? null;
      if (bannerFile) {
        bannerURL = await uploadBanner(user.uid, bannerFile);
      }

      await UserService.updateProfileDetails(user.uid, {
        name: trimmedName,
        bio,
        photoURL,
        bannerURL,
        avatarShape,
        websiteUrl,
        links: cleanedLinks,
        contactEmail,
        hideContactEmail,
        whatsapp,
        profileCategory,
        location,
        themeColor,
        visibility,
        hideLocation,
        hideLastActive,
        pinnedPostId,
        highlightPostIds,
      });

      setSaved(true);
      setTimeout(() => router.push("/dashboard/profil"), 700);
    } catch (err) {
      setError("Gagal menyimpan profil. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (profileLoading || !hydrated) {
    return <p className="p-8 font-mono text-sm text-paper-faint">Memuat...</p>;
  }

  const milestoneBadge = followerMilestoneBadge(followerCount);

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <Link href="/dashboard/profil" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Profil
      </Link>
      <h1 className="mt-3 font-display text-2xl font-semibold text-paper sm:text-3xl">Edit Profil</h1>
      <p className="mt-1 text-sm text-paper-dim">
        Perubahan langsung tampil di tamastudio.id/@{profile?.username || "..."} begitu disimpan.
      </p>

      <div className="mt-8 space-y-10">
        {/* 1. Identitas dasar */}
        <section className="space-y-4">
          <SectionLabel>Identitas Dasar</SectionLabel>

          <div>
            <p className="mb-1.5 text-sm text-paper-dim">Banner/Header</p>
            <div className="relative h-28 w-full overflow-hidden rounded-card border border-ink-line bg-ink-surface">
              {bannerPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerPreview} alt="" className="h-full w-full object-cover" />
              )}
              <label className="absolute bottom-2 right-2 cursor-pointer rounded-md border border-ink-line bg-ink/80 px-3 py-1.5 text-xs text-paper-dim hover:border-paper-dim">
                Ganti banner
                <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-ink-surface text-2xl font-semibold text-amber-soft ${
                avatarShape === "circle" ? "rounded-full" : "rounded-md"
              }`}
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                (name || "?").charAt(0).toUpperCase()
              )}
            </div>
            <div className="space-y-2">
              <label className="block cursor-pointer rounded-md border border-ink-line px-3 py-2 text-xs text-paper-dim hover:border-paper-dim">
                Ganti foto profil
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              <div className="flex gap-1 rounded-md border border-ink-line bg-ink-soft p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setAvatarShape("circle")}
                  className={`rounded px-2.5 py-1 ${avatarShape === "circle" ? "bg-ink-surface text-paper" : "text-paper-dim"}`}
                >
                  Bulat
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarShape("square")}
                  className={`rounded px-2.5 py-1 ${avatarShape === "square" ? "bg-ink-surface text-paper" : "text-paper-dim"}`}
                >
                  Kotak
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-paper-dim">Nama tampilan</label>
              <span className="font-mono text-xs text-paper-faint">
                {name.length}/{DISPLAY_NAME_MAX_LENGTH}
              </span>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, DISPLAY_NAME_MAX_LENGTH))}
              className={inputClass}
              placeholder="Nama yang keliatan orang"
            />
          </div>

          {profile?.username && (
            <div>
              <p className="mb-1.5 text-sm text-paper-dim">Username</p>
              <p className="font-mono text-sm text-amber-soft">
                tamastudio.id/@{profile.username}
              </p>
              <p className="mt-1 text-xs text-paper-faint">
                Ganti username lewat pengaturan akun — dipisah dari sini biar link lama yang sudah dibagikan tidak
                tiba-tiba putus tanpa sadar.
              </p>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-paper-dim">Bio/Deskripsi</label>
              <span className="font-mono text-xs text-paper-faint">
                {bio.length}/{BIO_MAX_LENGTH}
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
              rows={3}
              className={inputClass}
              placeholder="Ceritain tentang kamu... boleh pakai emoji & #hashtag"
            />
          </div>
        </section>

        {/* 2. Link & kontak */}
        <section className="space-y-4">
          <SectionLabel>Link &amp; Kontak</SectionLabel>

          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Link website utama</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={inputClass}
              placeholder="https://situskamu.com"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm text-paper-dim">Multi link (IG, YT, donasi, toko, dll)</p>
              <span className="font-mono text-xs text-paper-faint">
                {links.length}/{MAX_MULTI_LINKS}
              </span>
            </div>
            <div className="space-y-2">
              {links.map((link) => (
                <div key={link.id} className="flex gap-2">
                  <input
                    value={link.label}
                    onChange={(e) => updateLink(link.id, { label: e.target.value })}
                    className={`${inputClass} w-32 shrink-0`}
                    placeholder="Label"
                  />
                  <input
                    value={link.url}
                    onChange={(e) => updateLink(link.id, { url: e.target.value })}
                    className={inputClass}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(link.id)}
                    className="shrink-0 rounded-md border border-ink-line px-3 text-sm text-paper-faint hover:text-[#F45D5D]"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
            {links.length < MAX_MULTI_LINKS && (
              <button
                type="button"
                onClick={addLink}
                className="mt-2 rounded-md border border-dashed border-ink-line px-3 py-1.5 text-xs text-paper-dim hover:border-paper-dim"
              >
                + Tambah link
              </button>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Email kontak (buat collab/bisnis)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
              placeholder="collab@kamu.com"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-paper-dim">
              <input
                type="checkbox"
                checked={hideContactEmail}
                onChange={(e) => setHideContactEmail(e.target.checked)}
              />
              Sembunyikan email ini di profil publik
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Nomor WhatsApp (buat tombol chat langsung)</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+]/g, ""))}
              className={inputClass}
              placeholder="62812xxxxxxx"
            />
          </div>
        </section>

        {/* 3. Kategori & verifikasi */}
        <section className="space-y-4">
          <SectionLabel>Kategori &amp; Verifikasi</SectionLabel>

          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Kategori profil</label>
            <div className="flex flex-wrap gap-1.5">
              {PROFILE_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setProfileCategory(c.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    profileCategory === c.value ? "bg-amber text-ink" : "bg-ink-soft text-paper-dim"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Lokasi (opsional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
              placeholder="Kota, Negara"
            />
          </div>

          <div className="rounded-card border border-ink-line bg-ink-soft p-4">
            <p className="text-sm text-paper-dim">
              Centang verifikasi:{" "}
              {profile?.verified ? (
                <span className="text-mint">✓ Terverifikasi</span>
              ) : (
                <span className="text-paper-faint">Belum terverifikasi</span>
              )}
            </p>
            <p className="mt-1 text-xs text-paper-faint">
              Centang biru hanya diberikan admin TSC untuk akun resmi/creator terkenal — tidak bisa diaktifkan
              sendiri dari sini. Hubungi admin lewat laporan/pesan kalau merasa berhak dapat centang ini.
            </p>
          </div>
        </section>

        {/* 4. Kustomisasi & privasi */}
        <section className="space-y-4">
          <SectionLabel>Kustomisasi &amp; Privasi</SectionLabel>

          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Tema warna profil</label>
            <div className="flex flex-wrap gap-2">
              {THEME_COLORS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeColor(t.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                    themeColor === t.id ? "border-paper" : "border-transparent"
                  }`}
                  style={{ backgroundColor: t.hex }}
                  title={t.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Privasi akun</label>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVisibility(v.value)}
                  className={`block w-full rounded-md border px-4 py-3 text-left text-sm ${
                    visibility === v.value ? "border-amber bg-amber/10 text-amber-soft" : "border-ink-line text-paper-dim"
                  }`}
                >
                  <span className="font-medium">{v.label}</span>
                  <span className="block text-xs text-paper-faint">{v.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm text-paper-dim">Sembunyikan info</p>
            <div className="space-y-2 text-xs text-paper-dim">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={hideLocation} onChange={(e) => setHideLocation(e.target.checked)} />
                Sembunyikan lokasi
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hideLastActive}
                  onChange={(e) => setHideLastActive(e.target.checked)}
                />
                Sembunyikan terakhir online
              </label>
              <p className="text-paper-faint">
                (Email kontak punya toggle sendiri di bagian Link &amp; Kontak di atas.)
              </p>
            </div>
          </div>
        </section>

        {/* 5. Pin, highlight, badge */}
        <section className="space-y-4">
          <SectionLabel>Postingan &amp; Badge</SectionLabel>

          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Pin postingan (muncul paling atas di profil)</label>
            {myPosts.length === 0 ? (
              <p className="text-xs text-paper-faint">Belum ada postingan buat di-pin.</p>
            ) : (
              <select
                value={pinnedPostId ?? ""}
                onChange={(e) => setPinnedPostId(e.target.value || null)}
                className={inputClass}
              >
                <option value="">Tidak ada</option>
                {myPosts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm text-paper-dim">Highlight/Arsip (kumpulan postingan penting)</p>
              <span className="font-mono text-xs text-paper-faint">
                {highlightPostIds.length}/{MAX_HIGHLIGHTS}
              </span>
            </div>
            {myPosts.length === 0 ? (
              <p className="text-xs text-paper-faint">Belum ada postingan buat dijadikan highlight.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {myPosts.map((p) => {
                  const isSelected = highlightPostIds.includes(p.id);
                  const disabled = !isSelected && highlightPostIds.length >= MAX_HIGHLIGHTS;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleHighlight(p.id)}
                      className={`rounded-md px-2.5 py-1.5 text-left text-xs ${
                        isSelected
                          ? "bg-amber text-ink"
                          : disabled
                          ? "cursor-not-allowed bg-ink-soft text-paper-faint/40"
                          : "bg-ink-soft text-paper-dim hover:text-paper"
                      }`}
                    >
                      {p.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-card border border-ink-line bg-ink-soft p-4">
            <p className="text-sm text-paper-dim">Badge/Level</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile?.badge && (
                <span className="rounded-md bg-amber/10 px-2.5 py-1 font-mono text-xs text-amber-soft">
                  {profile.badge}
                </span>
              )}
              {milestoneBadge && (
                <span className="rounded-md bg-mint/10 px-2.5 py-1 font-mono text-xs text-mint">
                  {milestoneBadge}
                </span>
              )}
              {!profile?.badge && !milestoneBadge && (
                <span className="font-mono text-xs text-paper-faint">Member Baru</span>
              )}
            </div>
            <p className="mt-2 text-xs text-paper-faint">
              Badge follower (10+/100+/1000+ Pengikut) dihitung otomatis dari jumlah pengikutmu sekarang (
              {followerCount}). Badge custom seperti &quot;Top Creator&quot; diberikan admin, sama seperti centang
              verifikasi.
            </p>
          </div>
        </section>
      </div>

      {error && <p className="mt-6 text-sm text-[#F45D5D]">{error}</p>}

      <div className="sticky bottom-4 mt-8 flex items-center gap-3 rounded-card border border-ink-line bg-ink/95 p-3 backdrop-blur">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
        <Link href="/dashboard/profil" className="rounded-md border border-ink-line px-5 py-2.5 text-sm text-paper-dim">
          Batal
        </Link>
        {saved && <span className="text-sm text-mint">Tersimpan ✓</span>}
      </div>
    </div>
  );
}
