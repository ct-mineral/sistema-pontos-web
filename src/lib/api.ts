export type UserRole = "ALUNO" | "PRESTADOR" | "SERVIDOR";

export type SessionUser = {
  id: string;
  suapEnrollment: string;
  name: string | null;
  photo: string | null;
  role: UserRole;
};

export type ManagedUser = {
  id: string;
  suapEnrollment: string;
  role: UserRole;
  status: boolean;
};

export const ROLE_LABEL: Record<UserRole, string> = {
  ALUNO: "Aluno",
  PRESTADOR: "Prestador de serviço",
  SERVIDOR: "Servidor",
};

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3000";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new ApiError(
      await readMessage(response, "Não foi possível consultar a sessão."),
    );
  }
  return (await response.json()) as SessionUser;
}

export async function logout() {
  await fetch("/logout", { method: "POST" });
  window.location.assign("/");
}

export function authorizeEnrollment(suapEnrollment: string, role: UserRole) {
  return postJson<ManagedUser>(
    "/api/users/authorize",
    { suapEnrollment, role },
    "Não foi possível autorizar a matrícula.",
  );
}

export function updateEnrollmentStatus(suapEnrollment: string, status: boolean) {
  return postJson<ManagedUser>(
    "/api/users/update-status",
    { suapEnrollment, status },
    "Não foi possível atualizar a matrícula.",
  );
}

async function postJson<T>(path: string, body: unknown, fallback: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    window.location.assign("/");
    throw new ApiError("Sessão encerrada.");
  }
  if (!response.ok) throw new ApiError(await readMessage(response, fallback));
  return (await response.json()) as T;
}

async function readMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(" ");
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    return fallback;
  }
  return fallback;
}
