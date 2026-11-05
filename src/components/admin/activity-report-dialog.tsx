"use client";

import { useState } from "react";
import { Field, Notice } from "@/components/admin/page-frame";
import { ActionButton } from "@/components/form/action-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  fetchPeriodByEnrollment,
  type Group,
  type GroupPerson,
} from "@/lib/admin-api";
import {
  activityReportFileName,
  buildActivityReport,
  monthBounds,
} from "@/lib/activity-report";
import { ApiError } from "@/lib/api";
import { fortalezaToday, periodError } from "@/lib/schedule";

export function ActivityReportDialog({
  person,
  group,
  onOpenChange,
}: {
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
  onOpenChange: (open: boolean) => void;
}) {
  const currentMonth = fortalezaToday().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = person.name?.trim() || person.suapEnrollment;

  async function download() {
    const bounds = monthBounds(month);
    if (!bounds) {
      setError("Informe um mês válido.");
      return;
    }
    if (month > currentMonth) {
      setError("O mês ainda não pode ser emitido.");
      return;
    }
    const to = bounds.to > fortalezaToday() ? fortalezaToday() : bounds.to;
    const validation = periodError(bounds.from, to);
    if (validation) {
      setError(validation);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const period = await fetchPeriodByEnrollment(
        person.suapEnrollment,
        bounds.from,
        to,
      );
      const html = buildActivityReport({
        person,
        group,
        period,
        issuedAt: new Date().toISOString(),
      });
      const file = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = activityReportFileName(person.suapEnrollment, month);
      link.click();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível gerar o relatório.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relatório de atividades</DialogTitle>
          <DialogDescription>
            Baixe o mês de trabalho de {name} no grupo {group.name}. O arquivo
            reúne matrícula, horários de entrada e saída e as atividades de cada
            dia.
          </DialogDescription>
        </DialogHeader>
        <Field label="Mês" htmlFor="activity-report-month">
          <Input
            id="activity-report-month"
            type="month"
            max={currentMonth}
            value={month}
            className="h-9 rounded-sm"
            onChange={(event) => setMonth(event.target.value)}
          />
        </Field>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <DialogFooter>
          <ActionButton
            intent="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </ActionButton>
          <ActionButton disabled={busy} onClick={() => void download()}>
            {busy ? "Gerando…" : "Baixar relatório"}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
