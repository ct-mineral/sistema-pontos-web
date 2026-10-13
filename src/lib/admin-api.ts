import { getJson, postJson, type UserRole } from "@/lib/api";

export type GroupPerson = {
  suapEnrollment: string;
  name: string | null;
  role: UserRole;
};

export type Group = {
  id: string;
  name: string;
  dailyWorkloadMinutes: number;
  startTime: string | null;
  endTime: string | null;
  status: boolean;
  members: number;
  people: GroupPerson[];
};

export type QrCode = {
  id: string;
  location: string;
  status: boolean;
  createdAt: string;
};

export type WorkloadAdjustment = {
  id: string;
  suapEnrollment: string;
  groupId: string | null;
  groupName: string | null;
  dailyWorkloadMinutes: number;
  startTime: string | null;
  endTime: string | null;
  startDate: string;
  endDate: string | null;
};

export type DaySummary = {
  date: string;
  workedMinutes: number;
  expectedMinutes: number | null;
  remainingMinutes: number | null;
};

export type PeriodSummary = {
  from: string;
  to: string;
  workedMinutes: number;
  expectedMinutes: number | null;
  remainingMinutes: number | null;
  days: DaySummary[];
};

export function listGroups() {
  return getJson<Group[]>("/api/groups/list", "Não foi possível carregar os grupos.");
}

export function createGroup(name: string, startTime: string, endTime: string) {
  return postJson<Group>(
    "/api/groups/create",
    { name, startTime, endTime },
    "Não foi possível cadastrar o grupo.",
  );
}

export function assignGroup(suapEnrollment: string, groupId: string) {
  return postJson(
    "/api/groups/assign",
    { suapEnrollment, groupId },
    "Não foi possível vincular a matrícula.",
  );
}

export function unassignGroup(suapEnrollment: string, groupId: string) {
  return postJson(
    "/api/groups/unassign",
    { suapEnrollment, groupId },
    "Não foi possível remover a matrícula do grupo.",
  );
}

export function listQrCodes() {
  return getJson<QrCode[]>("/api/qr-codes/list", "Não foi possível carregar os QR codes.");
}

export function createQrCode(location: string) {
  return postJson<QrCode>(
    "/api/qr-codes/create",
    { location },
    "Não foi possível cadastrar o QR code.",
  );
}

export function updateQrCodeStatus(id: string, status: boolean) {
  return postJson<QrCode>(
    "/api/qr-codes/update-status",
    { id, status },
    "Não foi possível atualizar o QR code.",
  );
}

export function listAdjustments(suapEnrollment?: string) {
  const query = new URLSearchParams();
  if (suapEnrollment) query.set("suapEnrollment", suapEnrollment);
  const path = query.size
    ? `/api/workload-adjustments/list?${query.toString()}`
    : "/api/workload-adjustments/list";
  return getJson<WorkloadAdjustment[]>(path, "Não foi possível carregar os ajustes.");
}

export function createAdjustment(input: {
  suapEnrollment: string;
  groupId: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate?: string;
}) {
  return postJson<WorkloadAdjustment>(
    "/api/workload-adjustments/create",
    input,
    "Não foi possível cadastrar o ajuste.",
  );
}

export function fetchSummaryByEnrollment(suapEnrollment: string) {
  const query = new URLSearchParams({ suapEnrollment });
  return getJson<DaySummary>(
    `/api/time-records/summary-by-user?${query.toString()}`,
    "Não foi possível consultar o dia.",
  );
}

export function fetchPeriodByEnrollment(suapEnrollment: string, from: string, to: string) {
  const query = new URLSearchParams({ suapEnrollment, from, to });
  return getJson<PeriodSummary>(
    `/api/time-records/period-by-user?${query.toString()}`,
    "Não foi possível consultar o período.",
  );
}
