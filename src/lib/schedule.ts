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
