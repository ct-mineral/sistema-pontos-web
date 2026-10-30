"use client";

import { ActionButton } from "@/components/form/action-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  open,
  title,
  description,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <ActionButton intent="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </ActionButton>
          <ActionButton intent="danger" disabled={busy} onClick={onConfirm}>
            Excluir
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
