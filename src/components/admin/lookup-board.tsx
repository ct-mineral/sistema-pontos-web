"use client";

import { useState } from "react";
import {
  AdminPage,
  Field,
  Notice,
  Toolbar,
} from "@/components/admin/page-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPeriodByEnrollment,
  fetchSummaryByEnrollment,
  type DayActivity,
  type DaySummary,
  type PeriodSummary,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import {
  formatDay,
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
          <Field label="Matrícula" htmlFor="lookup-enrollment">
            <Input
              id="lookup-enrollment"
              value={enrollment}
              onChange={(event) => setEnrollment(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Field>
          <Field label="De" htmlFor="lookup-from">
            <Input
              id="lookup-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="Até" htmlFor="lookup-to">
            <Input
              id="lookup-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={loading}>
            Consultar hoje
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void loadPeriod()}
          >
            Aplicar período
          </Button>
        </Toolbar>
      </form>
      {notice ? <Notice tone="error">{notice}</Notice> : null}
      {queried && totals ? (
        <p className="text-sm text-muted-foreground">
          Matrícula {queried}
          {summary ? ` · ${formatDay(summary.date)}` : ""}
        </p>
      ) : null}
      {totals ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Trabalhado"
            value={minutesLabel(totals.workedMinutes)}
          />
          <Metric
            label="Previsto"
            value={minutesLabel(totals.expectedMinutes)}
          />
          <Metric
            label="Restante"
            value={minutesLabel(totals.remainingMinutes)}
          />
        </div>
      ) : null}
      {queried && days.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead>Trabalhado</TableHead>
              <TableHead>Previsto</TableHead>
              <TableHead>Restante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow key={day.date}>
                <TableCell className="font-medium">{formatDay(day.date)}</TableCell>
                <TableCell>{minutesLabel(day.workedMinutes)}</TableCell>
                <TableCell>{minutesLabel(day.expectedMinutes)}</TableCell>
                <TableCell>{minutesLabel(day.remainingMinutes)}</TableCell>
                <TableCell>
                  <DayDescriptions
                    enrollment={queried}
                    date={formatDay(day.date)}
                    activities={day.activities ?? []}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </AdminPage>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
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

function activityText(description: string | null) {
  const text = description?.trim();
  return text ? text : "Sem descrição";
}

function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
