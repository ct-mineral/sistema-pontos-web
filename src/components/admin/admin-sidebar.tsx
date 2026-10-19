"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, ClockPlus, IdCard, LogOut, QrCode, Search, SlidersHorizontal, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logout, type SessionUser } from "@/lib/api";
import { ActionButton } from "@/components/form/action-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export const ADMIN_ROUTES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/matriculas", label: "Matrículas", icon: IdCard },
  { href: "/admin/grupos", label: "Grupos", icon: Users },
  { href: "/admin/qr-codes", label: "QR Codes", icon: QrCode },
  { href: "/admin/ajustes", label: "Ajustes de carga", icon: SlidersHorizontal },
  { href: "/admin/justificativas", label: "Justificativas", icon: ClipboardCheck },
  { href: "/admin/abonos", label: "Abonos", icon: ClockPlus },
  { href: "/admin/consulta", label: "Consultar matrícula", icon: Search },
];

export function AdminSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
          <p className="text-sm font-semibold text-primary">Sistema de pontos</p>
          <p className="text-xs text-muted-foreground">Administração</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_ROUTES.map((route) => {
                const Icon = route.icon;
                return (
                  <SidebarMenuItem key={route.href} className="py-1">
                    <SidebarMenuButton
                      className="rounded-sm"
                      isActive={pathname === route.href}
                      tooltip={route.label}
                      render={<Link href={route.href} />}
                    >
                      <Icon />
                      <span>{route.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">{user.name?.trim() || "Servidor"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.suapEnrollment}</p>
        </div>
        <ActionButton intent="danger-solid" onClick={() => void logout()}>
          <LogOut className="text-white" />
          <span className="group-data-[collapsible=icon]:hidden text-white">Sair</span>
        </ActionButton>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
