"use client";

import { signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { UserService } from "@/lib/users";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.19 1.78 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.08 0 4.42-2.7 5.39-5.27 5.68.42.36.78 1.07.78 2.17 0 1.56-.02 2.82-.02 3.2 0 .3.22.66.8.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

const providers = [
  { id: "google", label: "Google", provider: googleProvider, icon: <GoogleIcon /> },
  { id: "github", label: "GitHub", provider: githubProvider, icon: <GitHubIcon /> },
] as const;

export default function AuthProviderButtons({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleClick(id: string, provider: (typeof providers)[number]["provider"]) {
    setLoadingId(id);
    try {
      const cred = await signInWithPopup(auth, provider);
      await UserService.ensureProfile({
        uid: cred.user.uid,
        name: cred.user.displayName || cred.user.email || "Anonim",
        email: cred.user.email ?? "",
        photoURL: cred.user.photoURL,
      });
      onSuccess();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Gagal masuk, coba lagi."
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handleClick(p.id, p.provider)}
          disabled={loadingId !== null}
          className="flex items-center justify-center gap-2 rounded-md border border-ink-line bg-ink-soft py-2.5 text-sm font-medium text-paper transition-colors hover:border-paper-dim disabled:opacity-50"
        >
          <span aria-hidden>{p.icon}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}
