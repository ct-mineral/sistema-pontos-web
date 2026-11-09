"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { AdminPage, EmptyRow, Field, Notice, Toolbar } from "@/components/admin/page-frame";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAdjustment,
  deleteAdjustment,
  listAdjustments,
  listGroups,
  updateAdjustment,
  type Group,
  type WorkloadAdjustment,
} from "@/lib/admin-api";
import { useCanManage } from "@/components/admin/panel-user";
import { ApiError } from "@/lib/api";
import { formatDay, formatMinutes, fortalezaToday, minutesToTime, timeToMinutes } from "@/lib/schedule";

export function AdjustmentsBoard() {
  const manage = useCanManage();
  const [items, setItems] = useState<WorkloadAdjustment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [editing, setEditing] = useState<WorkloadAdjustment | null>(null);
  const [removing, setRemoving] = useState<WorkloadAdjustment | null>(null);
  const today = fortalezaToday();

  async function reload(enrollment = filter) {
    const [next, groupList] = await Promise.all([
      listAdjustments(enrollment.trim() || undefined),
      listGroups(),
    ]);
    setItems(next || []);
    setGroups(groupList);
  }

  useEffect(() => {
    let active = true;
    Promise.all([listAdjustments(), listGroups()])
      .then(([next, groupList]) => {
        if (!active) return;
        setItems(next);
        setGroups(groupList);
      })
      .catch((caught: unknown) => {
        if (active) setNotice({ tone: "error", text: messageOf(caught, "Não foi possível carregar os ajustes.") });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminPage
      title="Ajustes de carga"
      description={
        manage
            ? "A carga vale para o grupo escolhido. A data final é opcional. Sem ela, o ajuste segue em aberto."
            : "Cargas especiais por matrícula. Esta conta só consulta os ajustes."
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setLoading(true);
          setNotice(null);
          reload()
            .catch((caught: unknown) => {
              setNotice({ tone: "error", text: messageOf(caught, "Não foi possível carregar os ajustes.") });
            })
            .finally(() => setLoading(false));
        }}
      >
        <Toolbar>
          <TextField id="adjustment-filter" placeholder="Informe a matrícula" label="Filtrar matrícula" value={filter} onValueChange={setFilter} />
          <ActionButton type="submit" disabled={loading}>
            Aplicar
          </ActionButton>
        </Toolbar>
      </form>
      {manage ? (
        <CreateAdjustmentForm
          groups={groups.filter((group) => group.status)}
          busy={busy}
          onSubmit={async (input) => {
            setBusy(true);
            setNotice(null);
            try {
              await createAdjustment(input);
              await reload();
              setNotice({ tone: "ok", text: "Ajuste cadastrado." });
            } catch (caught) {
              setNotice({ tone: "error", text: messageOf(caught, "Não foi possível cadastrar o ajuste.") });
            }
          }}
        />
      ) : null}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matrícula</TableHead>
            <TableHead>Grupo</TableHead>
          <TableHead>Carga diária</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Situação</TableHead>
            {manage ? <TableHead className="text-right">Ações</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <EmptyRow colSpan={manage ? 7 : 6}>Carregando ajustes…</EmptyRow>
          ) : items.length === 0 ? (
            <EmptyRow colSpan={manage ? 7 : 6}>Nenhum ajuste cadastrado.</EmptyRow>
          ) : (
            items.map((item) => {
              const state = adjustmentState(item, today);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.suapEnrollment}</TableCell>
                  <TableCell>{item.groupName ?? "—"}</TableCell>
                  <TableCell>{formatMinutes(item.dailyWorkloadMinutes)}</TableCell>
                  <TableCell>{formatDay(item.startDate)}</TableCell>
                  <TableCell>{item.endDate ? formatDay(item.endDate) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={state === "closed" ? "outline" : "secondary"}>
                      {state === "open" ? "Em aberto" : state === "scheduled" ? "Agendado" : "Encerrado"}
                    </Badge>
                  </TableCell>
                  {manage ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ActionButton size="sm" intent="outline" disabled={busy} onClick={() => setEditing(item)}>
                          Editar
                        </ActionButton>
                        <ActionButton size="sm" intent="danger" disabled={busy} onClick={() => setRemoving(item)}>
                          Excluir
                        </ActionButton>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {editing ? (
        <EditAdjustmentDialog
          key={editing.id}
          item={editing}
          groups={groups.filter((group) => group.status || group.id === editing.groupId)}
          busy={busy}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSave={async (input) => {
            setBusy(true);
            try {
              const next = await updateAdjustment({ id: editing.id, ...input });
              setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
              setEditing(null);
              setNotice({ tone: "ok", text: "Ajuste atualizado." });
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        title="Excluir ajuste"
        description={
          removing ? `Excluir o ajuste da matrícula ${removing.suapEnrollment}? Essa ação não pode ser desfeita.` : ""
        }
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        onConfirm={() => {
          if (!removing) return;
          setBusy(true);
          setNotice(null);
          deleteAdjustment(removing.id)
            .then(() => {
              setItems((current) => current.filter((item) => item.id !== removing.id));
              setRemoving(null);
              setNotice({ tone: "ok", text: "Ajuste excluído." });
            })
            .catch((caught: unknown) => {
              setNotice({ tone: "error", text: messageOf(caught, "Não foi possível excluir o ajuste.") });
              setRemoving(null);
            })
            .finally(() => setBusy(false));
        }}
      />
    </AdminPage>
  );
}

function EditAdjustmentDialog({
  item,
  groups,
  busy,
  onOpenChange,
  onSave,
}: {
  item: WorkloadAdjustment;
  groups: Group[];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    suapEnrollment: string;
    groupId: string;
    dailyWorkloadMinutes: number;
    startDate: string;
    endDate?: string;
  }) => Promise<void>;
}) {
  const [enrollment, setEnrollment] = useState(item.suapEnrollment);
  const [groupId, setGroupId] = useState(item.groupId ?? "");
  const [dailyWorkload, setDailyWorkload] = useState(minutesToTime(item.dailyWorkloadMinutes));
  const [startDate, setStartDate] = useState(item.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(item.endDate?.slice(0, 10) ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar ajuste</DialogTitle>
          <DialogDescription>Altere a carga, o grupo ou o período deste ajuste.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const workload = timeToMinutes(dailyWorkload);
            if (!enrollment.trim() || !groupId || !startDate || !Number.isInteger(workload) || workload <= 0) {
              setFormError("Informe a matrícula, o grupo, uma carga válida e a data de início.");
              return;
            }
            if (endDate && endDate < startDate) {
              setFormError("A data de fim precisa ser igual ou posterior à de início.");
              return;
            }
            setFormError(null);
            void (async () => {
              try {
                await onSave({
                  suapEnrollment: enrollment.trim(),
                  groupId,
                  dailyWorkloadMinutes: workload,
                  startDate,
                  ...(endDate ? { endDate } : {}),
                });
              } catch (caught) {
                setFormError(messageOf(caught, "Não foi possível editar o ajuste."));
              }
            })();
          }}
        >
          <TextField
            id="edit-adjustment-enrollment"
            label="Matrícula"
            value={enrollment}
            onValueChange={setEnrollment}
          />
          <Field label="Grupo" htmlFor="edit-adjustment-group">
            <Select value={groupId || null} onValueChange={(value) => setGroupId(value ?? "")}>
              <SelectTrigger id="edit-adjustment-group" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="edit-adjustment-workload"
              label="Carga diária (horas)"
              type="time"
              value={dailyWorkload}
              onValueChange={setDailyWorkload}
            />
            <TextField id="edit-adjustment-from" label="Início" type="date" value={startDate} onValueChange={setStartDate} />
            <TextField id="edit-adjustment-to" label="Fim" type="date" value={endDate} onValueChange={setEndDate} />
          </div>
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          <DialogFooter>
            <ActionButton intent="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </ActionButton>
            <ActionButton type="submit" disabled={busy}>
              Salvar
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateAdjustmentForm({
  groups,
  busy,
  onSubmit,
}: {
  groups: Group[];
  busy: boolean;
  onSubmit: (input: {
    suapEnrollment: string;
    groupId: string;
    dailyWorkloadMinutes: number;
    startDate: string;
    endDate?: string;
  }) => Promise<void>;
}) {
  const [enrollment, setEnrollment] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dailyWorkload, setDailyWorkload] = useState("08:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const workload = timeToMinutes(dailyWorkload);
        if (!enrollment.trim() || !groupId || !startDate || !Number.isInteger(workload) || workload <= 0) {
          setFormError("Informe a matrícula, o grupo, uma carga válida e a data de início.");
          return;
        }
        if (endDate && endDate < startDate) {
          setFormError("A data de fim precisa ser igual ou posterior à de início.");
          return;
        }
        setFormError(null);
        void onSubmit({
          suapEnrollment: enrollment.trim(),
          groupId,
          dailyWorkloadMinutes: workload,
          startDate,
          ...(endDate ? { endDate } : {}),
        }).then(() => {
          setEnrollment("");
          setStartDate("");
          setEndDate("");
        });
      }}
    >
      <Toolbar>
        <TextField
          id="adjustment-enrollment"
          label="Matrícula"
          value={enrollment}
          onValueChange={setEnrollment}
          placeholder="Informe a matrícula"
        />
        <Field label="Grupo" htmlFor="adjustment-group">
          <Select value={groupId || null} onValueChange={(value) => setGroupId(value ?? "")}>
            <SelectTrigger className="rounded-sm w-52" id="adjustment-group">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <TextField
          id="adjustment-workload"
          label="Carga diária (horas)"
          type="time"
          value={dailyWorkload}
          onValueChange={setDailyWorkload}
        />
        <TextField id="adjustment-from" label="Início" type="date" value={startDate} onValueChange={setStartDate} />
        <TextField id="adjustment-to" label="Fim" type="date" value={endDate} onValueChange={setEndDate} />
        <ActionButton type="submit" disabled={busy}>
          Cadastrar ajuste
        </ActionButton>
      </Toolbar>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
    </form>
  );
}

function adjustmentState(item: WorkloadAdjustment, today: string) {
  const start = item.startDate.slice(0, 10);
  const end = item.endDate?.slice(0, 10) ?? null;
  if (end && end < today) return "closed";
  if (start > today) return "scheduled";
  return "open";
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

type NoticeState = { tone: "ok" | "error"; text: string };
