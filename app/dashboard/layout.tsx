"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/useAuth";
import { useUserProfile } from "@/lib/useUserProfile";
import { auth } from "@/lib/firebase";
import { UserService } from "@/lib/users";
import Sidebar from "@/components/Sidebar";

const LAST_ACTIVE_THROTTLE_MS = 10 * 60 * 1000; // 10 menit
const LAST_ACTIVE_STORAGE_KEY = "tsc:lastActiveTouchedAt";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!profileLoading && profile?.status === "suspended") {
      signOut(auth).then(() => router.push("/login?suspended=1"));
    }
  }, [profile, profileLoading, router]);

  useEffect(() => {
    if (!profileLoading && profile && !profile.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [profile, profileLoading, router]);

  // Catat "terakhir online" — di-throttle lewat sessionStorage biar cuma
  // sekali per ~10 menit per tab, bukan tiap kali komponen ini render ulang.
  useEffect(() => {
    if (!user) return;
    const last = Number(sessionStorage.getItem(LAST_ACTIVE_STORAGE_KEY) || 0);
    if (Date.now() - last < LAST_ACTIVE_THROTTLE_MS) return;
    sessionStorage.setItem(LAST_ACTIVE_STORAGE_KEY, String(Date.now()));
    UserService.touchLastActive(user.uid);
  }, [user]);

  if (
    loading ||
    !user ||
    profileLoading ||
    profile?.status === "suspended" ||
    (profile && !profile.onboardingComplete)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-paper-faint">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={profile?.role === "admin"} />
      <main className="flex-1 px-6 py-8 sm:px-10">{children}</main>
    </div>
  );
}
