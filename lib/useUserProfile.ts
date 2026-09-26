"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { UserService, type UserProfile } from "./users";

export function useUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const unsub = UserService.subscribe(user.uid, (p) => {
      setProfile(p);
      setLoading(false);
    });
    return unsub;
  }, [user, authLoading]);

  return { profile, loading };
}
