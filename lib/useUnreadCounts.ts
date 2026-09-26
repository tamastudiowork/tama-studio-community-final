"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./useAuth";
import { GroupService } from "./groups";
import { DmService } from "./dms";

/**
 * Bukan realtime penuh (sengaja, biar tidak perlu subscribe ke setiap
 * grup & percakapan sekaligus di layout global) — dihitung ulang tiap
 * kali pengguna pindah halaman. Cukup untuk badge notifikasi biasa;
 * kalau butuh update instan tanpa reload/navigasi, ini titik yang perlu
 * diganti jadi listener realtime per grup/percakapan.
 */
export function useUnreadCounts() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [groupsUnread, setGroupsUnread] = useState(0);
  const [dmsUnread, setDmsUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([GroupService.countUnread(user.uid), DmService.countUnread(user.uid)]).then(
      ([g, d]) => {
        if (!cancelled) {
          setGroupsUnread(g);
          setDmsUnread(d);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  return { groupsUnread, dmsUnread };
}
