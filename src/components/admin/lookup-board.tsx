"use client";

import { useState } from "react";
import { AdminPage, Notice, Toolbar } from "@/components/admin/page-frame";
import { ActionButton } from "@/components/form/action-button";
import { TextField } from "@/components/form/text-field";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JustificationBadge } from "@/components/admin/justifications-board";
import {
  fetchPeriodByEnrollment,
  fetchSummaryByEnrollment,
  ALLOWANCE_LABEL,
  type DayActivity,
  type DayAllowance,
  type DayJustification,
  type DaySummary,
  type GroupHours,
  type PeriodSummary,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import {
  formatDay,
  formatMinutes,
  formatTime,
  fortalezaToday,
  minutesLabel,
  periodError,
} from "@/lib/schedule";

export function LookupBoard() {
  const today = fortalezaToday();
  const [enrollment, setEnrollment] = useState("");
  const [from, setFrom] = useState(shiftDay(today, -6));
  const [to, setTo] = useState(today);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [period, setPeriod] = useState<PeriodSummary | null>(null);
  const [queried, setQueried] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadToday() {
    const suapEnrollment = enrollment.trim();
    if (!suapEnrollment) {
      setNotice("Informe a matrícula.");
      return;
    }
    setLoading(true);
    setNotice(null);
    setPeriod(null);
    try {
      setSummary(await fetchSummaryByEnrollment(suapEnrollment));
      setQueried(suapEnrollment);
    } catch (caught) {
      setSummary(null);
      setNotice(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível consultar o dia.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPeriod() {
    const suapEnrollment = enrollment.trim();
    const validation = periodError(from, to);
    if (!suapEnrollment) {
      setNotice("Informe a matrícula.");
      return;
    }
    if (validation) {
      setNotice(validation);
      return;
    }
    setLoading(true);
    setNotice(null);
    setSummary(null);
    try {
      setPeriod(await fetchPeriodByEnrollment(suapEnrollment, from, to));
      setQueried(suapEnrollment);
    } catch (caught) {
      setPeriod(null);
      setNotice(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível consultar o período.",
      );
    } finally {
      setLoading(false);
    }
  }

  const totals = summary ?? period;
  const days = summary ? [summary] : (period?.days ?? []);

  return (
    <AdminPage
      title="Consultar matrícula"
      description="Veja o dia de hoje ou um período de até 31 dias de um aluno ou prestador."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void loadToday();
        }}
      >
        <Toolbar>
          <TextField
            id="lookup-enrollment"
            placeholder="Informe a matrícula"
            label="Matrícula"
            value={enrollment}
            onValueChange={setEnrollment}
          />
          <TextField
            id="lookup-from"
            label="De"
            type="date"
            value={from}
            onValueChange={setFrom}
          />
          <TextField
            id="lookup-to"
            label="Até"
            type="date"
            value={to}
            onValueChange={setTo}
          />
          <ActionButton type="submit" disabled={loading}>
            Consultar hoje
          </ActionButton>
          <ActionButton
            intent="outline"
            disabled={loading}
            onClick={() => void loadPeriod()}
          >
            Aplicar período
          </ActionButton>
        </Toolbar>
      </form>
      {notice ? <Notice tone="error">{notice}</Notice> : null}
      {queried && totals ? (
        <p className="text-sm text-muted-foreground">
          Matrícula {queried}
          {summary ? ` · ${formatDay(summary.date)}` : ""}
        </p>
      ) : null}
      {totals ? <GroupHoursCards groups={totals.groups} /> : null}
      {queried && days.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Trabalhado</TableHead>
              <TableHead>Previsto</TableHead>
              <TableHead>Restante</TableHead>
              <TableHead>Justificativa</TableHead>
              <TableHead>Descrições</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.flatMap((day) =>
              day.groups.length === 0 ? (
                <TableRow key={day.date}>
                  <TableCell className="font-medium">
                    {formatDay(day.date)}
                  </TableCell>
                  <TableCell colSpan={5}>
                    Nenhum grupo com horário neste dia.
                  </TableCell>
                  <TableCell>
                    <DayNotes day={day} />
                  </TableCell>
                  <TableCell>
                    <DayDescriptions
                      enrollment={queried}
                      date={formatDay(day.date)}
                      activities={day.activities ?? []}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                day.groups.map((group, index) => (
                  <TableRow key={`${day.date}-${group.id ?? group.name}`}>
                    <TableCell className="font-medium">
                      {formatDay(day.date)}
                    </TableCell>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{minutesLabel(group.workedMinutes)}</TableCell>
                    <TableCell>{minutesLabel(group.expectedMinutes)}</TableCell>
                    <TableCell>
                      {minutesLabel(group.remainingMinutes)}
                    </TableCell>
                    <TableCell>
                      {index === 0 ? <DayNotes day={day} /> : null}
                    </TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <DayDescriptions
                          enrollment={queried}
                          date={formatDay(day.date)}
                          activities={day.activities ?? []}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ),
            )}
          </TableBody>
        </Table>
      ) : null}
    </AdminPage>
  );
}

function GroupHoursCards({ groups }: { groups: GroupHours[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum grupo com horário neste período.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <Card key={group.id ?? group.name} size="sm">
          <CardHeader>
            <CardTitle>{group.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Hours
                label="Trabalhado"
                value={minutesLabel(group.workedMinutes)}
              />
              <Hours
                label="Previsto"
                value={minutesLabel(group.expectedMinutes)}
              />
              <Hours
                label="Restante"
                value={minutesLabel(group.remainingMinutes)}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Hours({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium">{value}</p>
    </div>
  );
}

function DayDescriptions({
  enrollment,
  date,
  activities,
}: {
  enrollment: string;
  date: string;
  activities: DayActivity[];
}) {
  return (
    <Dialog>
      <DialogTrigger
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Ver descrições
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Descrições de {date}</DialogTitle>
          <DialogDescription>
            Textos informados na saída da matrícula {enrollment}.
          </DialogDescription>
        </DialogHeader>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma saída registrada neste dia.
          </p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto">
            {activities.map((activity) => (
              <li key={activity.recordedAt}>
                <p className="text-xs text-muted-foreground">
                  {formatTime(activity.recordedAt)}
                </p>
                <p className="whitespace-pre-wrap">
                  {activityText(activity.description)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DayNotes({ day }: { day: DaySummary }) {
  const justifications = day.justifications ?? [];
  const allowances = day.allowances ?? [];
  if (justifications.length === 0 && allowances.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-3">
      <JustificationMarks items={justifications} />
      <AllowanceMarks items={allowances} />
    </div>
  );
}

function AllowanceMarks({ items }: { items: DayAllowance[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="space-y-1">
          <p className="text-sm font-medium">
            Abono {ALLOWANCE_LABEL[item.status]} · {minutesLabel(item.minutes)}
          </p>
          <p className="text-xs text-muted-foreground">{item.groupName}</p>
          <p className="max-w-xs whitespace-pre-wrap text-sm">{item.reason}</p>
          {(item.documents ?? []).map((document) => (
            <a
              key={document.id}
              className="block text-sm underline"
              href={`/api/time-records/allowances/${item.id}/documents/${document.id}`}
              target="_blank"
              rel="noreferrer"
            >
              {document.fileName}
            </a>
          ))}
        </li>
      ))}
    </ul>
  );
}

function JustificationMarks({ items }: { items: DayJustification[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={`${item.recordedAt}-${item.status}`} className="space-y-1">
          <JustificationBadge status={item.status} />
          <p className="text-xs text-muted-foreground">
            Saída {formatTime(item.recordedAt)} · fim do turno{" "}
            {item.scheduledEnd}
            {item.missingMinutes != null
              ? ` · faltante ${formatMinutes(item.missingMinutes)}`
              : ""}
          </p>
          <p className="max-w-xs whitespace-pre-wrap text-sm">
            {item.reason?.trim() || "Aguardando motivo"}
          </p>
          {item.makeupDate && item.makeupStart && item.makeupEnd ? (
            <p className="text-sm">
              Acerto em {formatDay(item.makeupDate)}, das {item.makeupStart} às{" "}
              {item.makeupEnd}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function activityText(description: string | null) {
  const text = description?.trim();
  return text ? text : "Sem descrição";
}

function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
