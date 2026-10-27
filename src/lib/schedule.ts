const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function formatMinutes(total: number) {
  const hours = Math.floor(Math.abs(total) / 60);
  const minutes = Math.abs(total) % 60;
  const text = `${hours}h ${String(minutes).padStart(2, "0")}min`;
  return total < 0 ? `-${text}` : text;
}

export function formatSchedule(
  start: string | null,
  end: string | null,
  minutes: number,
) {
  const load = `${formatMinutes(minutes)} por dia`;
  return start && end ? `${start}–${end} · ${load}` : load;
}

export function formatDay(value: string) {
  const day = value.slice(0, 10);
  const [year, month, date] = day.split("-");
  if (!year || !month || !date) return value;
  return `${date}/${month}/${year}`;
}

export function fortalezaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function periodError(from: string, to: string) {
  if (!DATE.test(from) || !DATE.test(to)) return "Use datas no formato AAAA-MM-DD.";
  if (to < from) return "A data final precisa ser igual ou posterior à inicial.";
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  const days = Math.round((end - start) / 86_400_000) + 1;
  if (days > 31) return "O período pode ter no máximo 31 dias.";
  return null;
}

export function minutesLabel(value: number | null | undefined) {
  return value == null ? "não definido" : formatMinutes(value);
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function shiftLabel(startTime: string | null) {
  if (!startTime) return null;
  const hours = Number(startTime.slice(0, 2));
  if (Number.isNaN(hours)) return null;
  if (hours < 12) return "Manhã";
  if (hours < 18) return "Tarde";
  return "Noite";
}

export function peopleCountLabel(count: number) {
  if (count === 0) return "Nenhuma pessoa";
  if (count === 1) return "1 pessoa";
  return `${count} pessoas`;
}

export function scheduleRange(start: string | null, end: string | null) {
  return start && end ? `${start}–${end}` : "Horário não definido";
}
