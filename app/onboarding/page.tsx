"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/lib/useAuth";
import { useUserProfile } from "@/lib/useUserProfile";
import { UserService, type Occupation, type PersonalFirebaseConfig } from "@/lib/users";
import { uploadAvatar } from "@/lib/fileUpload";
import OnboardingStep from "./_components/OnboardingStep";

const TOTAL_STEPS = 5;

const OCCUPATIONS: { value: Occupation; label: string }[] = [
  { value: "software-engineer", label: "Software Engineer" },
  { value: "web-development", label: "Web Development" },
  { value: "design", label: "Design" },
  { value: "other", label: "Lainnya" },
];

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [dob, setDob] = useState("");
  // Step 2
  const [purpose, setPurpose] = useState("");
  // Step 3
  const [occupation, setOccupation] = useState<Occupation | "">("");
  const [occupationOther, setOccupationOther] = useState("");
  // Step 4 (opsional)
  const [useFirebaseConfig, setUseFirebaseConfig] = useState(false);
  const [fbApiKey, setFbApiKey] = useState("");
  const [fbAuthDomain, setFbAuthDomain] = useState("");
  const [fbProjectId, setFbProjectId] = useState("");
  const [fbStorageBucket, setFbStorageBucket] = useState("");
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState("");
  const [fbAppId, setFbAppId] = useState("");
  const [fbRealtimeDbUrl, setFbRealtimeDbUrl] = useState("");
  // Step 5
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [submitting, setSubmitting] = useState(false);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Isi default nama dari akun yang sudah ada begitu profil termuat.
  useEffect(() => {
    if (profile && !name) setName(profile.name || "");
  }, [profile, name]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!profileLoading && profile?.onboardingComplete) router.push("/dashboard");
  }, [profileLoading, profile, router]);

  function checkUsername(value: string) {
    setUsername(value);
    setUsernameStatus("idle");
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    const trimmed = value.trim();
    if (!trimmed) return;
    usernameCheckTimer.current = setTimeout(async () => {
      setUsernameStatus("checking");
      const available = await UserService.isUsernameAvailable(trimmed);
      setUsernameStatus(available ? "available" : "taken");
    }, 500);
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function goNext() {
    setError(null);

    if (step === 1 && !dob) {
      setError("Tanggal lahir wajib diisi.");
      return;
    }
    if (step === 2 && !purpose.trim()) {
      setError("Ceritakan dulu tujuanmu gabung TSC.");
      return;
    }
    if (step === 3) {
      if (!occupation) {
        setError("Pilih salah satu pekerjaan.");
        return;
      }
      if (occupation === "other" && !occupationOther.trim()) {
        setError("Tulis pekerjaanmu.");
        return;
      }
    }

    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  function skipFirebaseConfig() {
    setUseFirebaseConfig(false);
    setError(null);
    setStep(5);
  }

  async function handleFinish() {
    setError(null);

    if (!name.trim()) {
      setError("Nama profil wajib diisi.");
      return;
    }
    if (!username.trim()) {
      setError("Username wajib diisi.");
      return;
    }
    if (usernameStatus === "taken") {
      setError("Username sudah dipakai. Pilih yang lain dulu.");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      // Pastikan sekali lagi username masih tersedia tepat sebelum
      // submit (menutup celah race condition kalau ada orang lain
      // mengklaim username yang sama persis di detik terakhir).
      const stillAvailable = await UserService.isUsernameAvailable(username);
      if (!stillAvailable) {
        setUsernameStatus("taken");
        setError("Username baru saja dipakai orang lain. Pilih yang lain.");
        setSubmitting(false);
        return;
      }

      let photoURL = user.photoURL;
      if (photoFile) {
        photoURL = await uploadAvatar(user.uid, photoFile);
        await updateProfile(user, { photoURL });
      }
      if (name.trim() !== user.displayName) {
        await updateProfile(user, { displayName: name.trim() });
      }

      const personalFirebaseConfig: PersonalFirebaseConfig | null = useFirebaseConfig
        ? {
            apiKey: fbApiKey.trim(),
            authDomain: fbAuthDomain.trim(),
            projectId: fbProjectId.trim(),
            storageBucket: fbStorageBucket.trim(),
            messagingSenderId: fbMessagingSenderId.trim(),
            appId: fbAppId.trim(),
            realtimeDbUrl: fbRealtimeDbUrl.trim(),
          }
        : null;

      await UserService.claimUsername(user.uid, username);
      await UserService.completeOnboarding(user.uid, {
        name: name.trim(),
        username,
        bio,
        dob,
        purpose,
        occupation: occupation as Occupation,
        occupationOther,
        personalFirebaseConfig,
      });

      router.push("/dashboard");
    } catch (err) {
      setError("Ada yang gagal disimpan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || profileLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-paper-faint">Memuat...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      {step === 1 && (
        <OnboardingStep step={1} totalSteps={TOTAL_STEPS} title="Kapan kamu lahir?" subtitle="Cuma buat kami, tidak ditampilkan ke publik.">
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
          />
          {error && <p className="mt-2 text-sm text-[#F45D5D]">{error}</p>}
          <div className="mt-6 flex justify-end">
            <button onClick={goNext} className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow">
              Lanjut
            </button>
          </div>
        </OnboardingStep>
      )}

      {step === 2 && (
        <OnboardingStep
          step={2}
          totalSteps={TOTAL_STEPS}
          title="Buat apa Tama Studio Community?"
          subtitle="Ceritakan tujuanmu gabung — belajar, cari kolaborator, cari kerja, atau yang lain."
        >
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Aku mau belajar ngoding dari nol dan cari teman belajar bareng..."
          />
          {error && <p className="mt-2 text-sm text-[#F45D5D]">{error}</p>}
          <div className="mt-6 flex justify-between">
            <button onClick={goBack} className="rounded-md border border-ink-line px-5 py-2.5 text-sm text-paper-dim">
              Kembali
            </button>
            <button onClick={goNext} className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow">
              Lanjut
            </button>
          </div>
        </OnboardingStep>
      )}

      {step === 3 && (
        <OnboardingStep step={3} totalSteps={TOTAL_STEPS} title="Kesibukanmu sekarang apa?" subtitle="Biar kami bisa sesuaikan rekomendasi konten.">
          <div className="space-y-2">
            {OCCUPATIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setOccupation(o.value)}
                className={`block w-full rounded-md border px-4 py-3 text-left text-sm ${
                  occupation === o.value ? "border-amber bg-amber/10 text-amber-soft" : "border-ink-line text-paper-dim"
                }`}
              >
                {o.label}
              </button>
            ))}
            {occupation === "other" && (
              <input
                value={occupationOther}
                onChange={(e) => setOccupationOther(e.target.value)}
                placeholder="Tulis pekerjaanmu"
                className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
              />
            )}
          </div>
          {error && <p className="mt-2 text-sm text-[#F45D5D]">{error}</p>}
          <div className="mt-6 flex justify-between">
            <button onClick={goBack} className="rounded-md border border-ink-line px-5 py-2.5 text-sm text-paper-dim">
              Kembali
            </button>
            <button onClick={goNext} className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow">
              Lanjut
            </button>
          </div>
        </OnboardingStep>
      )}

      {step === 4 && (
        <OnboardingStep
          step={4}
          totalSteps={TOTAL_STEPS}
          title="Firebase project sendiri (opsional)"
          subtitle="Lewati saja kalau belum punya atau belum perlu — bisa diisi kapan pun nanti dari halaman profil."
        >
          {!useFirebaseConfig ? (
            <div>
              <div className="rounded-card border border-ink-line bg-ink-soft p-4 text-sm text-paper-dim">
                <p className="font-medium text-paper">Cara ambil config Firebase kamu sendiri:</p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                  <li>Buka <span className="text-amber-soft">console.firebase.google.com</span>, login dengan akun Google kamu.</li>
                  <li>Klik <span className="text-paper">Add project</span> (atau pilih project yang sudah ada).</li>
                  <li>Di dashboard project, klik ikon <span className="text-paper">{"</>"}</span> (Web) untuk daftarkan aplikasi web baru.</li>
                  <li>Kasih nama aplikasi bebas, klik <span className="text-paper">Register app</span>.</li>
                  <li>Firebase akan tampilkan blok kode berisi <code className="text-amber-soft">firebaseConfig</code> — salin nilai <code>apiKey</code>, <code>authDomain</code>, <code>projectId</code>, <code>storageBucket</code>, <code>messagingSenderId</code>, dan <code>appId</code> ke kolom di bawah.</li>
                  <li>Untuk Realtime Database: di menu kiri klik <span className="text-paper">Build → Realtime Database → Create Database</span>. Setelah dibuat, salin URL yang muncul di atas tabel data (bentuknya <code>https://nama-project-default-rtdb.firebaseio.com</code>).</li>
                </ol>
              </div>
              <div className="mt-4 flex justify-between">
                <button onClick={goBack} className="rounded-md border border-ink-line px-5 py-2.5 text-sm text-paper-dim">
                  Kembali
                </button>
                <div className="flex gap-2">
                  <button onClick={skipFirebaseConfig} className="rounded-md border border-ink-line px-5 py-2.5 text-sm text-paper-dim">
                    Lewati
                  </button>
                  <button
                    onClick={() => setUseFirebaseConfig(true)}
                    className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow"
                  >
                    Isi sekarang
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input value={fbApiKey} onChange={(e) => setFbApiKey(e.target.value)} placeholder="apiKey" className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber" />
              <input value={fbAuthDomain} onChange={(e) => setFbAuthDomain(e.target.value)} placeholder="authDomain" className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber" />
              <input value={fbProjectId} onChange={(e) => setFbProjectId(e.target.value)} placeholder="projectId" className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber" />
              <input value={fbStorageBucket} onChange={(e) => setFbStorageBucket(e.target.value)} placeholder="storageBucket" className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber" />
              <input value={fbMessagingSenderId} onChange={(e) => setFbMessagingSenderId(e.target.value)} placeholder="messagingSenderId" className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber" />
              <input value={fbAppId} onChange={(e) => setFbAppId(e.target.value)} placeholder="appId" className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber" />
              <input value={fbRealtimeDbUrl} onChange={(e) => setFbRealtimeDbUrl(e.target.value)} placeholder="Link Realtime Database (https://...firebaseio.com)" className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber" />
              <p className="text-xs text-paper-faint">
                Cuma tempel config web biasa (bukan service account/private key). Ini disimpan di profilmu untuk pengembangan fitur publish mandiri ke depannya — belum otomatis dipakai sistem apa pun saat ini.
              </p>
              <div className="flex justify-between pt-2">
                <button onClick={() => setUseFirebaseConfig(false)} className="rounded-md border border-ink-line px-5 py-2.5 text-sm text-paper-dim">
                  Kembali
                </button>
                <button onClick={() => setStep(5)} className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow">
                  Lanjut
                </button>
              </div>
            </div>
          )}
        </OnboardingStep>
      )}

      {step === 5 && (
        <OnboardingStep step={5} totalSteps={TOTAL_STEPS} title="Terakhir, lengkapi profilmu" subtitle="Nama dan username wajib diisi, sisanya boleh dilewati.">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-surface text-xl font-semibold text-amber-soft">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase() || "?"
                )}
              </div>
              <label className="cursor-pointer rounded-md border border-ink-line px-3 py-2 text-xs text-paper-dim hover:border-paper-dim">
                Pilih foto (opsional)
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-paper-dim">Nama profil</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
                placeholder="Nama tampilan kamu"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-paper-dim">Username</label>
              <input
                value={username}
                onChange={(e) => checkUsername(e.target.value)}
                className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
                placeholder="username-unik-kamu"
              />
              {usernameStatus === "checking" && <p className="mt-1 text-xs text-paper-faint">Mengecek...</p>}
              {usernameStatus === "taken" && (
                <p className="mt-1 text-xs text-[#F45D5D]">Username telah digunakan, harap isi yang baru.</p>
              )}
              {usernameStatus === "available" && <p className="mt-1 text-xs text-mint">Username tersedia.</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-paper-dim">Deskripsi profil (opsional)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
                placeholder="Ceritakan sedikit tentang kamu..."
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-[#F45D5D]">{error}</p>}

          <div className="mt-6 flex justify-between">
            <button onClick={goBack} className="rounded-md border border-ink-line px-5 py-2.5 text-sm text-paper-dim">
              Kembali
            </button>
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : "Selesai"}
            </button>
          </div>
        </OnboardingStep>
      )}
    </main>
  );
}
