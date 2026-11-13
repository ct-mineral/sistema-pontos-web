"use client";

import type { AttendanceState } from "@/components/admin/group-attendance";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DayInterval, GroupPerson } from "@/lib/admin-api";
import { formatDay, formatTime } from "@/lib/schedule";

type Punch = DayInterval & { entryAt: string };

export function AttendanceHistoryDialog({
  person,
  date,
  state,
  onOpenChange,
}: {
  person: GroupPerson;
  date: string;
  state: AttendanceState | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const punches: Punch[] =
    state?.status === "ready"
      ? state.intervals
          .filter((item): item is Punch => Boolean(item.entryAt))
          .sort((a, b) => a.entryAt.localeCompare(b.entryAt))
      : [];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pontos de {formatDay(date)}</DialogTitle>
          <DialogDescription>
            {person.name?.trim() || "Sem nome"} · matrícula{" "}
            {person.suapEnrollment}
          </DialogDescription>
        </DialogHeader>
        {state?.status === "error" ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : punches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum ponto registrado neste dia.
          </p>
        ) : (
          <ul className="max-h-96 space-y-3 overflow-y-auto">
            {punches.map((punch, index) => (
              <li
                key={`${punch.entryAt}-${index}`}
                className="space-y-2 rounded-md border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Entrada {formatTime(punch.entryAt)}
                    {punch.exitAt ? ` · Saída ${formatTime(punch.exitAt)}` : ""}
                  </p>
                  {!punch.exitAt ? (
                    <Badge>Em aberto</Badge>
                  ) : punch.refused ? (
                    <Badge variant="destructive">Saída recusada</Badge>
                  ) : null}
                </div>
                {punch.exitAt ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {punch.description?.trim() || "Sem descrição"}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
