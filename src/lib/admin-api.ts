import { getJson, postJson, type UserRole } from "@/lib/api";

export type GroupPerson = {
  suapEnrollment: string;
  name: string | null;
  role: UserRole | null;
};

export type Group = {
  id: string;
  name: string;
  dailyWorkloadMinutes: number;
  startTime: string | null;
  endTime: string | null;
  status: boolean;
  members: number;
  breakStartTime: string | null;
  breakEndTime: string | null;
  autoPunchTime: string | null;
  people: GroupPerson[];
  createdAt: string;
  updatedAt: string;
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

export type DayActivity = {
  recordedAt: string;
  description: string | null;
};

export type DayInterval = {
  entryAt: string | null;
  exitAt: string | null;
  groupId: string | null;
  description: string | null;
  refused: boolean;
};

export type JustificationStatus =
  | "PENDENTE"
  | "APROVADA"
  | "APROVADA_PARCIAL"
  | "RECUSADA";

export const JUSTIFICATION_LABEL: Record<JustificationStatus, string> = {
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  APROVADA_PARCIAL: "Aprovada parcialmente",
  RECUSADA: "Recusada",
};

export type DayJustification = {
  recordedAt: string;
  scheduledEnd: string;
  missingMinutes?: number | null;
  reason: string | null;
  status: JustificationStatus;
  makeupDate: string | null;
  makeupStart: string | null;
  makeupEnd: string | null;
  groupId?: string | null;
};

export type EarlyExitJustification = {
  id: string;
  userId: string;
  suapEnrollment: string;
  name: string | null;
  groupName: string | null;
  recordedAt: string;
  scheduledEnd: string;
  missingMinutes?: number | null;
  reason: string | null;
  status: JustificationStatus;
  makeupDate: string | null;
  makeupStart: string | null;
  makeupEnd: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
};

export type AllowanceStatus = "PENDENTE" | "APROVADO" | "RECUSADO";

export const ALLOWANCE_LABEL: Record<AllowanceStatus, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
};

export type AllowanceDocument = {
  id: string;
  fileName: string;
};

export type DayAllowance = {
  id: string;
  groupId: string;
  groupName: string;
  minutes: number;
  reason: string;
  status: AllowanceStatus;
  documents?: AllowanceDocument[];
};

export type TimeAllowance = {
  id: string;
  userId: string;
  suapEnrollment: string;
  name: string | null;
  groupId: string;
  groupName: string;
  day: string;
  minutes: number;
  reason: string;
  status: AllowanceStatus;
  documents?: AllowanceDocument[];
  reviewerName: string | null;
  reviewedAt: string | null;
};

export type GroupHours = {
  id: string | null;
  name: string;
  startTime: string | null;
  endTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  workedMinutes: number;
  expectedMinutes: number | null;
  remainingMinutes: number | null;
  scheduleVaries: boolean;
};

export type DaySummary = {
  date: string;
  workedMinutes: number;
  expectedMinutes: number | null;
  remainingMinutes: number | null;
  groups: GroupHours[];
  activities: DayActivity[];
  intervals?: DayInterval[];
  justifications: DayJustification[];
  allowances: DayAllowance[];
};

export type PeriodSummary = {
  from: string;
  to: string;
  workedMinutes: number;
  expectedMinutes: number | null;
  remainingMinutes: number | null;
  groups: GroupHours[];
  days: DaySummary[];
};

export function listGroups() {
  return getJson<Group[]>(
    "/api/groups/list",
    "Não foi possível carregar os grupos.",
  );
}

export function createGroup(
  name: string,
  startTime: string,
  endTime: string,
  breakStartTime: string,
  breakEndTime: string,
  autoPunchTime: string,
) {
  return postJson<Group>(
    "/api/groups/create",
    {
      name,
      startTime,
      endTime,
      breakStartTime: breakStartTime || undefined,
      breakEndTime: breakEndTime || undefined,
      autoPunchTime: autoPunchTime || undefined,
    },
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

export function updateGroup(
  id: string,
  name: string,
  startTime: string,
  endTime: string,
  breakStartTime: string,
  breakEndTime: string,
  autoPunchTime: string,
) {
  return postJson<Group>(
    "/api/groups/update",
    {
      id,
      name,
      startTime,
      endTime,
      breakStartTime: breakStartTime || undefined,
      breakEndTime: breakEndTime || undefined,
      autoPunchTime: autoPunchTime || undefined,
    },
    "Não foi possível editar o grupo.",
  );
}

export function updateGroupStatus(id: string, status: boolean) {
  return postJson<Group>(
    "/api/groups/update-status",
    { id, status },
    "Não foi possível atualizar o grupo.",
  );
}

export function deleteGroup(id: string) {
  return postJson<{ id: string }>(
    "/api/groups/delete",
    { id },
    "Não foi possível excluir o grupo.",
  );
}

export function listQrCodes() {
  return getJson<QrCode[]>(
    "/api/qr-codes/list",
    "Não foi possível carregar os QR codes.",
  );
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

export function updateQrCode(id: string, location: string) {
  return postJson<QrCode>(
    "/api/qr-codes/update",
    { id, location },
    "Não foi possível editar o QR code.",
  );
}

export function deleteQrCode(id: string) {
  return postJson<{ id: string }>(
    "/api/qr-codes/delete",
    { id },
    "Não foi possível excluir o QR code.",
  );
}

export function listAdjustments(suapEnrollment?: string) {
  const query = new URLSearchParams();
  if (suapEnrollment) query.set("suapEnrollment", suapEnrollment);
  const path = query.size
    ? `/api/workload-adjustments/list?${query.toString()}`
    : "/api/workload-adjustments/list";
  return getJson<WorkloadAdjustment[]>(
    path,
    "Não foi possível carregar os ajustes.",
  );
}

export function createAdjustment(input: AdjustmentInput) {
  return postJson<WorkloadAdjustment>(
    "/api/workload-adjustments/create",
    input,
    "Não foi possível cadastrar o ajuste.",
  );
}

export function updateAdjustment(input: AdjustmentInput & { id: string }) {
  return postJson<WorkloadAdjustment>(
    "/api/workload-adjustments/update",
    input,
    "Não foi possível editar o ajuste.",
  );
}

export function deleteAdjustment(id: string) {
  return postJson<{ id: string }>(
    "/api/workload-adjustments/delete",
    { id },
    "Não foi possível excluir o ajuste.",
  );
}

type AdjustmentInput = {
  suapEnrollment: string;
  groupId: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate?: string;
};

export function fetchSummaryByEnrollment(suapEnrollment: string) {
  const query = new URLSearchParams({ suapEnrollment });
  return getJson<DaySummary>(
    `/api/time-records/summary-by-user?${query.toString()}`,
    "Não foi possível consultar o dia.",
  );
}

export function listAllowances() {
  return getJson<TimeAllowance[]>(
    "/api/time-records/allowances",
    "Não foi possível carregar os abonos.",
  );
}

export function reviewAllowance(id: string, status: "APROVADO" | "RECUSADO") {
  return postJson<TimeAllowance>(
    "/api/time-records/allowances/review",
    { id, status },
    "Não foi possível analisar o abono.",
  );
}

export function listJustifications() {
  return getJson<EarlyExitJustification[]>(
    "/api/time-records/justifications",
    "Não foi possível carregar as justificativas.",
  );
}

export function reviewJustification(
  id: string,
  status: "APROVADA" | "APROVADA_PARCIAL" | "RECUSADA",
  makeup?: { makeupDate: string; makeupStart: string },
) {
  return postJson<EarlyExitJustification>(
    "/api/time-records/justifications/review",
    { id, status, ...makeup },
    "Não foi possível analisar a justificativa.",
  );
}

export function fetchPeriodByEnrollment(
  suapEnrollment: string,
  from: string,
  to: string,
) {
  const query = new URLSearchParams({ suapEnrollment, from, to });
  return getJson<PeriodSummary>(
    `/api/time-records/period-by-user?${query.toString()}`,
    "Não foi possível consultar o período.",
  );
}
