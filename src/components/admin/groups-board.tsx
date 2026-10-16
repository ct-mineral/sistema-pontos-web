"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { AdminPage, EmptyRow, Field, Notice, StatusBadge, Toolbar } from "@/components/admin/page-frame";
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
  assignGroup,
  createGroup,
  deleteGroup,
  listGroups,
  unassignGroup,
  updateGroup,
  updateGroupStatus,
  type Group,
} from "@/lib/admin-api";
import { ApiError, ROLE_LABEL } from "@/lib/api";
import { formatSchedule } from "@/lib/schedule";

export function GroupsBoard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [removing, setRemoving] = useState<Group | null>(null);

  async function reload() {
    setGroups(await listGroups());
  }

  useEffect(() => {
    let active = true;
    listGroups()
      .then((rows) => {
        if (active) setGroups(rows);
      })
      .catch((caught: unknown) => {
        if (active) setNotice({ tone: "error", text: messageOf(caught, "Não foi possível carregar os grupos.") });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function changeStatus(group: Group) {
    setBusy(true);
    setNotice(null);
    try {
      await updateGroupStatus(group.id, !group.status);
      await reload();
      setNotice({ tone: "ok", text: group.status ? "Grupo desativado." : "Grupo ativado." });
    } catch (caught) {
      setNotice({ tone: "error", text: messageOf(caught, "Não foi possível atualizar o grupo.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage
      title="Grupos"
      description="Cadastre o horário do grupo e vincule as matrículas. Uma matrícula pode participar de vários grupos."
    >
      <CreateGroupForm
        busy={busy}
        onSubmit={async (input) => {
          setBusy(true);
          setNotice(null);
          try {
            await createGroup(input.name, input.startTime, input.endTime);
            await reload();
            setNotice({ tone: "ok", text: "Grupo cadastrado." });
          } catch (caught) {
            setNotice({ tone: "error", text: messageOf(caught, "Não foi possível cadastrar o grupo.") });
          } finally {
            setBusy(false);
          }
        }}
      />
      <MembershipForm
        groups={groups.filter((group) => group.status)}
        busy={busy}
        onSubmit={async (input) => {
          setBusy(true);
          setNotice(null);
          try {
            if (input.action === "assign") await assignGroup(input.enrollment, input.groupId);
            else await unassignGroup(input.enrollment, input.groupId);
            await reload();
            setNotice({
              tone: "ok",
              text: input.action === "assign" ? "Usuário vinculado ao grupo." : "Usuário removido do grupo.",
            });
          } catch (caught) {
            setNotice({ tone: "error", text: messageOf(caught, "Não foi possível atualizar o vínculo.") });
          } finally {
            setBusy(false);
          }
        }}
      />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Grupo</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Pessoas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <EmptyRow colSpan={5}>Carregando grupos…</EmptyRow>
          ) : groups.length === 0 ? (
            <EmptyRow colSpan={5}>Nenhum grupo cadastrado.</EmptyRow>
          ) : (
            groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{formatSchedule(group.startTime, group.endTime, group.dailyWorkloadMinutes)}</TableCell>
                <TableCell>{peopleLabel(group)}</TableCell>
                <TableCell>
                  <StatusBadge active={group.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      size="sm"
                      intent={group.status ? "outline" : "primary"}
                      disabled={busy}
                      onClick={() => void changeStatus(group)}
                    >
                      {group.status ? "Desativar" : "Ativar"}
                    </ActionButton>
                    <ActionButton size="sm" intent="outline" disabled={busy} onClick={() => setEditing(group)}>
                      Editar
                    </ActionButton>
                    <ActionButton size="sm" intent="danger" disabled={busy} onClick={() => setRemoving(group)}>
                      Excluir
                    </ActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {editing ? (
        <EditGroupDialog
          key={editing.id}
          group={editing}
          busy={busy}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSave={async (input) => {
            setBusy(true);
            try {
              await updateGroup(editing.id, input.name, input.startTime, input.endTime);
              await reload();
              setEditing(null);
              setNotice({ tone: "ok", text: "Grupo atualizado." });
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        title="Excluir grupo"
        description={
          removing
            ? `Excluir o grupo ${removing.name}? Os vínculos saem junto. Grupos com ponto ou ajuste de carga não podem ser excluídos.`
            : ""
        }
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        onConfirm={() => {
          if (!removing) return;
          setBusy(true);
          setNotice(null);
          deleteGroup(removing.id)
            .then(async () => {
              await reload();
              setRemoving(null);
              setNotice({ tone: "ok", text: "Grupo excluído." });
            })
            .catch((caught: unknown) => {
              setNotice({ tone: "error", text: messageOf(caught, "Não foi possível excluir o grupo.") });
              setRemoving(null);
            })
            .finally(() => setBusy(false));
        }}
      />
    </AdminPage>
  );
}

function EditGroupDialog({
  group,
  busy,
  onOpenChange,
  onSave,
}: {
  group: Group;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { name: string; startTime: string; endTime: string }) => Promise<void>;
}) {
  const [name, setName] = useState(group.name);
  const [startTime, setStartTime] = useState(group.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(group.endTime ?? "12:00");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar grupo</DialogTitle>
          <DialogDescription>Altere o nome e o horário deste grupo.</DialogDescription>
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
            setFormError(null);
            try {
              await onSave({ name: name.trim(), startTime, endTime });
            } catch (caught) {
              setFormError(messageOf(caught, "Não foi possível editar o grupo."));
            }
          }}
        >
          <TextField id="edit-group-name" label="Nome" value={name} onValueChange={setName} />
          <TextField id="edit-group-start" label="Entrada" type="time" value={startTime} onValueChange={setStartTime} />
          <TextField id="edit-group-end" label="Saída" type="time" value={endTime} onValueChange={setEndTime} />
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

function CreateGroupForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (input: { name: string; startTime: string; endTime: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !startTime || !endTime) {
          setFormError("Informe o nome, a entrada e a saída.");
          return;
        }
        if (endTime <= startTime) {
          setFormError("A saída precisa ser depois da entrada.");
          return;
        }
        setFormError(null);
        void onSubmit({ name: name.trim(), startTime, endTime }).then(() => setName(""));
      }}
    >
      <Toolbar>
        <TextField id="group-name" label="Nome" value={name} onValueChange={setName} placeholder="Informe o nome do grupo" />
        <TextField id="group-start" label="Entrada" type="time" value={startTime} onValueChange={setStartTime} />
        <TextField id="group-end" label="Saída" type="time" value={endTime} onValueChange={setEndTime} />
        <ActionButton type="submit" disabled={busy}>
          Cadastrar grupo
        </ActionButton>
      </Toolbar>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
    </form>
  );
}

function MembershipForm({
  groups,
  busy,
  onSubmit,
}: {
  groups: Group[];
  busy: boolean;
  onSubmit: (input: { enrollment: string; groupId: string; action: "assign" | "unassign" }) => Promise<void>;
}) {
  const [enrollment, setEnrollment] = useState("");
  const [groupId, setGroupId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(action: "assign" | "unassign") {
    if (!enrollment.trim() || !groupId) {
      setFormError("Informe a matrícula e o grupo.");
      return;
    }
    setFormError(null);
    await onSubmit({ enrollment: enrollment.trim(), groupId, action });
    setEnrollment("");
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit("assign");
      }}
    >
      <Toolbar>
        <TextField
          id="group-enrollment"
          label="Matrícula"
          value={enrollment}
          onValueChange={setEnrollment}
          placeholder="Informe a matrícula do usuário"
          className="w-2xs"
        />
        <Field label="Grupo ativo" htmlFor="group-choice">
          <Select value={groupId || null} onValueChange={(value) => setGroupId(value ?? "")}>
            <SelectTrigger className="rounded-sm w-2xs py-4" id="group-choice">
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
        <ActionButton type="submit" disabled={busy}>
          Vincular
        </ActionButton>
        <ActionButton intent="danger-soft" disabled={busy} onClick={() => void submit("unassign")}>
          Remover do grupo
        </ActionButton>
      </Toolbar>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
    </form>
  );
}

function peopleLabel(group: Group) {
  if (group.people.length === 0) return "—";
  return group.people
    .map((person) => {
      const role = person.role ? ROLE_LABEL[person.role] : "aguardando acesso";
      return `${person.name?.trim() || person.suapEnrollment} (${role})`;
    })
    .join(", ");
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

type NoticeState = { tone: "ok" | "error"; text: string };
