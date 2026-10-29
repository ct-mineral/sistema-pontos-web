import type { SessionUser } from "@/lib/api";

export function canManage(user: Pick<SessionUser, "role"> | null | undefined) {
  return user?.role === "SERVIDOR";
}

export function canOpenPanel(user: SessionUser | null | undefined) {
  return user != null && (user.role === "SERVIDOR" || user.viewer === true);
}
