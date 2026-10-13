"use client";

import { useEffect, useState } from "react";
import { fetchSession, type SessionUser } from "@/lib/api";

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchSession()
      .then((session) => {
        if (!active) return;
        setUser(session);
        setPhase("ready");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível consultar a sessão.",
        );
        setPhase("ready");
      });
    return () => {
      active = false;
    };
  }, []);

  return { user, phase, error };
}
