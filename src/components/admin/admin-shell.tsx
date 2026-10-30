"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PanelUserProvider } from "@/components/admin/panel-user";
import { canManage, canOpenPanel } from "@/lib/access";
import { useSession } from "@/lib/use-session";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, phase, error } = useSession();
  const allowed = canOpenPanel(user);

  useEffect(() => {
    if (phase === "ready" && !allowed) router.replace("/");
  }, [allowed, phase, router]);

  if (phase === "loading" || !allowed || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">{error ?? "Carregando sessão…"}</p>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" />
          <p className="text-sm text-muted-foreground">
            {canManage(user) ? "Administração" : "Consulta"}
          </p>
        </header>
        <PanelUserProvider user={user}>{children}</PanelUserProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
