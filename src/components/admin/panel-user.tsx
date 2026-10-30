"use client";

import { createContext, useContext, type ReactNode } from "react";
import { canManage } from "@/lib/access";
import type { SessionUser } from "@/lib/api";

const PanelUserContext = createContext<SessionUser | null>(null);

export function PanelUserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <PanelUserContext.Provider value={user}>{children}</PanelUserContext.Provider>;
}

export function usePanelUser() {
  const user = useContext(PanelUserContext);
  if (!user) throw new Error("Sessão do painel indisponível");
  return user;
}

export function useCanManage() {
  return canManage(usePanelUser());
}
