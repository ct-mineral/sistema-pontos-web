"use client";

import { useState } from "react";
import { Notice } from "@/components/admin/page-frame";
import { ActionButton } from "@/components/form/action-button";
import { TextField } from "@/components/form/text-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { minutesToTime, timeToMinutes } from "@/lib/schedule";

export type GroupScheduleInput = {
  name: string;
  dailyWorkloadMinutes: number;
};

export function GroupScheduleDialog({
  title,
  description,
  initial,
  busy,
  submitLabel,
  onOpenChange,
  onSave,
}: {
  title: string;
  description: string;
  initial: GroupScheduleInput;
  busy: boolean;
  submitLabel: string;
  onOpenChange: (open: boolean) => void;
  onSave: (input: GroupScheduleInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [dailyWorkload, setDailyWorkload] = useState(
    minutesToTime(initial.dailyWorkloadMinutes),
  );
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const workload = timeToMinutes(dailyWorkload);
            if (!name.trim() || !Number.isInteger(workload) || workload <= 0) {
              setFormError("Informe o nome e uma carga horária diária válida.");
              return;
            }
            setFormError(null);
            try {
              await onSave({
                name: name.trim(),
                dailyWorkloadMinutes: workload,
              });
            } catch (caught) {
              setFormError(
                caught instanceof ApiError
                  ? caught.message
                  : "Não foi possível salvar o grupo.",
              );
            }
          }}
        >
          <TextField
            id="group-schedule-name"
            label="Nome"
            value={name}
            onValueChange={setName}
            placeholder="Informe o nome do grupo"
          />
          <TextField
            id="group-schedule-workload"
            label="Carga diária (horas)"
            type="time"
            value={dailyWorkload}
            onValueChange={setDailyWorkload}
          />
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          <DialogFooter>
            <ActionButton
              intent="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </ActionButton>
            <ActionButton type="submit" disabled={busy}>
              {submitLabel}
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
