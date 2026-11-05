import {
  ALLOWANCE_LABEL,
  JUSTIFICATION_LABEL,
  type DayAllowance,
  type DayInterval,
  type DayJustification,
  type DaySummary,
  type Group,
  type GroupPerson,
  type PeriodSummary,
} from "@/lib/admin-api";
import { ROLE_LABEL } from "@/lib/api";
import {
  formatDateTime,
  formatDay,
  formatMinutes,
  formatTime,
  minutesLabel,
  scheduleRange,
} from "@/lib/schedule";

const MONTH = /^\d{4}-\d{2}$/;

export function monthBounds(month: string) {
  if (!MONTH.test(month)) return null;
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  if (!year || monthIndex < 1 || monthIndex > 12) return null;
  const last = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  };
}

export function activityReportFileName(enrollment: string, month: string) {
  const safe = enrollment.replace(/[^\w.-]+/g, "") || "matricula";
  return `relatorio-atividades-${safe}-${month}.html`;
}

export function buildActivityReport(input: {
  person: GroupPerson;
  group: Pick<
    Group,
    | "id"
    | "name"
    | "startTime"
    | "endTime"
    | "breakStartTime"
    | "breakEndTime"
    | "dailyWorkloadMinutes"
  >;
  period: PeriodSummary;
  issuedAt: string;
}) {
  const { person, group, period, issuedAt } = input;
  const totals = sumGroup(period.days, group.id);
  const name = person.name?.trim() || "Nome não informado";
  const role = person.role ? ROLE_LABEL[person.role] : "Aguardando acesso";
  const rows = period.days.flatMap((day) => dayRows(day, group.id));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório de atividades — ${escapeHtml(name)}</title>
  <style>
    body { margin: 24px; color: #1a1a1a; font: 14px/1.45 "Segoe UI", sans-serif; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    h2 { margin: 28px 0 8px; font-size: 16px; }
    p { margin: 0; }
    .muted { color: #555; }
    table { width: 100%; border-collapse: collapse; }
    .facts td { padding: 3px 16px 3px 0; vertical-align: top; }
    .facts th { padding: 3px 16px 3px 0; font-weight: 600; text-align: left; white-space: nowrap; }
    .days { margin-top: 8px; font-size: 12px; }
    .days th, .days td { border: 1px solid #d0d0d0; padding: 6px 8px; vertical-align: top; text-align: left; }
    .days th { background: #f3f3f3; }
    .sign { margin-top: 48px; }
    .line { display: inline-block; width: 280px; border-bottom: 1px solid #1a1a1a; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <p class="muted">Sistema de pontos</p>
  <h1>Relatório de atividades</h1>
  <p class="muted">Documento para validação do trabalho realizado no mês.</p>
  <h2>Identificação</h2>
  <table class="facts">
    <tr><th>Funcionário</th><td>${escapeHtml(name)}</td></tr>
    <tr><th>Matrícula</th><td>${escapeHtml(person.suapEnrollment)}</td></tr>
    <tr><th>Papel</th><td>${escapeHtml(role)}</td></tr>
    <tr><th>Grupo</th><td>${escapeHtml(group.name)}</td></tr>
    <tr><th>Horário do grupo</th><td>${escapeHtml(scheduleRange(group.startTime, group.endTime))}</td></tr>
    <tr><th>Intervalo</th><td>${escapeHtml(group.breakStartTime && group.breakEndTime ? `${group.breakStartTime}–${group.breakEndTime}` : "Não informado")}</td></tr>
    <tr><th>Carga diária</th><td>${escapeHtml(formatMinutes(group.dailyWorkloadMinutes))}</td></tr>
    <tr><th>Período</th><td>${escapeHtml(formatDay(period.from))} a ${escapeHtml(formatDay(period.to))}</td></tr>
    <tr><th>Emitido em</th><td>${escapeHtml(formatDateTime(issuedAt))}</td></tr>
  </table>
  <h2>Resumo do mês neste grupo</h2>
  <table class="facts">
    <tr><th>Trabalhado</th><td>${escapeHtml(minutesLabel(totals.workedMinutes))}</td></tr>
    <tr><th>Previsto</th><td>${escapeHtml(minutesLabel(totals.expectedMinutes))}</td></tr>
    <tr><th>Saldo</th><td>${escapeHtml(minutesLabel(totals.remainingMinutes))}</td></tr>
  </table>
  <h2>Registros do mês</h2>
  <table class="days">
    <thead>
      <tr>
        <th>Dia</th>
        <th>Horário previsto</th>
        <th>Entrada</th>
        <th>Saída</th>
        <th>Atividade</th>
        <th>Carga do dia</th>
        <th>Observações</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join("\n      ")}
    </tbody>
  </table>
  <div class="sign">
    <p>Responsável pela validação</p>
    <p style="margin-top: 36px"><span class="line"></span></p>
    <p class="muted">Nome e data</p>
  </div>
</body>
</html>
`;
}

function sumGroup(days: DaySummary[], groupId: string) {
  let workedMinutes = 0;
  let expectedMinutes = 0;
  let expectedKnown = false;
  for (const day of days) {
    const line = day.groups.find((group) => group.id === groupId);
    if (!line) continue;
    workedMinutes += line.workedMinutes;
    if (line.expectedMinutes != null) {
      expectedKnown = true;
      expectedMinutes += line.expectedMinutes;
    }
  }
  return {
    workedMinutes,
    expectedMinutes: expectedKnown ? expectedMinutes : null,
    remainingMinutes: expectedKnown ? expectedMinutes - workedMinutes : null,
  };
}

function dayRows(day: DaySummary, groupId: string) {
  const line = day.groups.find((group) => group.id === groupId) ?? null;
  const intervals = (day.intervals ?? []).filter(
    (interval) => interval.groupId === groupId,
  );
  const notes = notesOf(day, groupId);
  const date = `${formatDay(day.date)} · ${weekday(day.date)}`;
  const schedule = line ? scheduleRange(line.startTime, line.endTime) : "—";
  const load = line
    ? `${minutesLabel(line.workedMinutes)} trabalhados · ${minutesLabel(line.expectedMinutes)} previstos`
    : "—";
  const punches = intervals.length > 0 ? intervals : [null];

  return punches.map((interval, index) => {
    const first = index === 0;
    return `<tr>
        <td>${escapeHtml(first ? date : "")}</td>
        <td>${escapeHtml(first ? schedule : "")}</td>
        <td>${escapeHtml(interval ? clock(interval.entryAt) : "—")}</td>
        <td>${escapeHtml(interval ? exitLabel(interval) : "—")}</td>
        <td>${escapeHtml(interval ? activityText(interval.description) : "Sem registro de ponto")}</td>
        <td>${escapeHtml(first ? load : "")}</td>
        <td>${first ? notes : ""}</td>
      </tr>`;
  });
}

function notesOf(day: DaySummary, groupId: string) {
  const items = [
    ...(day.justifications ?? [])
      .filter((item) => item.groupId === groupId)
      .map(justificationText),
    ...(day.allowances ?? [])
      .filter((item) => item.groupId === groupId)
      .map(allowanceText),
  ];
  if (items.length === 0) return "—";
  return items.map((item) => escapeHtml(item)).join("<br />");
}

function justificationText(item: DayJustification) {
  const makeup =
    item.makeupDate && item.makeupStart && item.makeupEnd
      ? ` Acerto em ${formatDay(item.makeupDate)}, das ${item.makeupStart} às ${item.makeupEnd}.`
      : "";
  const missing =
    item.missingMinutes != null
      ? ` Faltante: ${minutesLabel(item.missingMinutes)}.`
      : "";
  return `Carga incompleta ${JUSTIFICATION_LABEL[item.status]} às ${formatTime(item.recordedAt)}, fim do turno ${item.scheduledEnd}.${missing} ${item.reason?.trim() || "Aguardando motivo."}${makeup}`;
}

function allowanceText(item: DayAllowance) {
  return `Abono ${ALLOWANCE_LABEL[item.status]} de ${minutesLabel(item.minutes)}. ${item.reason.trim()}`;
}

function exitLabel(interval: DayInterval) {
  if (!interval.exitAt) return "Em aberto";
  const time = clock(interval.exitAt);
  return interval.refused ? `${time} (recusada)` : time;
}

function activityText(description: string | null) {
  const text = description?.trim();
  return text ? text : "Sem descrição";
}

function clock(value: string | null) {
  return value ? formatTime(value) : "—";
}

function weekday(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
