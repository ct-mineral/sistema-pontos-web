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

export type GroupScheduleInput = {
  name: string;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
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
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [breakStartTime, setBreakStartTime] = useState(initial.breakStartTime);
  const [breakEndTime, setBreakEndTime] = useState(initial.breakEndTime);
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
            if (!name.trim() || !startTime || !endTime) {
              setFormError("Informe o nome, a entrada e a saída.");
              return;
            }
            if (endTime <= startTime) {
              setFormError("A saída precisa ser depois da entrada.");
              return;
            }
            if (Boolean(breakStartTime) !== Boolean(breakEndTime)) {
              setFormError("Informe o início e o fim do intervalo.");
              return;
            }
            if (breakStartTime && breakEndTime && (breakStartTime <= startTime || breakEndTime >= endTime || breakEndTime <= breakStartTime)) {
              setFormError("O intervalo precisa estar entre a entrada e a saída.");
              return;
            }
            setFormError(null);
            try {
              await onSave({ name: name.trim(), startTime, endTime, breakStartTime, breakEndTime });
            } catch (caught) {
              setFormError(caught instanceof ApiError ? caught.message : "Não foi possível salvar o grupo.");
            }
          }}
        >
          <TextField id="group-schedule-name" label="Nome" value={name} onValueChange={setName} placeholder="Informe o nome do grupo" />
          <TextField id="group-schedule-start" label="Entrada" type="time" value={startTime} onValueChange={setStartTime} />
          <TextField id="group-schedule-break-start" label="Início do intervalo (opcional)" type="time" value={breakStartTime} onValueChange={setBreakStartTime} />
          <TextField id="group-schedule-break-end" label="Fim do intervalo (opcional)" type="time" value={breakEndTime} onValueChange={setBreakEndTime} />
          <TextField id="group-schedule-end" label="Saída" type="time" value={endTime} onValueChange={setEndTime} />
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          <DialogFooter>
            <ActionButton intent="outline" disabled={busy} onClick={() => onOpenChange(false)}>
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
