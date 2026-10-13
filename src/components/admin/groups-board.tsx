"use client";

import { useEffect, useState } from "react";
import { AdminPage, EmptyRow, Field, Notice, StatusBadge, Toolbar } from "@/components/admin/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  listGroups,
  unassignGroup,
  type Group,
} from "@/lib/admin-api";
import { ApiError, ROLE_LABEL, type UserRole } from "@/lib/api";
import { formatSchedule } from "@/lib/schedule";

export function GroupsBoard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [busy, setBusy] = useState(false);

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <EmptyRow colSpan={4}>Carregando grupos…</EmptyRow>
          ) : groups.length === 0 ? (
            <EmptyRow colSpan={4}>Nenhum grupo cadastrado.</EmptyRow>
          ) : (
            groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{formatSchedule(group.startTime, group.endTime, group.dailyWorkloadMinutes)}</TableCell>
                <TableCell>{peopleLabel(group)}</TableCell>
                <TableCell>
                  <StatusBadge active={group.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </AdminPage>
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
        <Field label="Nome" htmlFor="group-name">
          <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Entrada" htmlFor="group-start">
          <Input id="group-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </Field>
        <Field label="Saída" htmlFor="group-end">
          <Input id="group-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>
          Cadastrar grupo
        </Button>
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
        <Field label="Matrícula" htmlFor="group-enrollment">
          <Input
            id="group-enrollment"
            value={enrollment}
            onChange={(event) => setEnrollment(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>
        <Field label="Grupo ativo" htmlFor="group-choice">
          <Select value={groupId || null} onValueChange={(value) => setGroupId(value ?? "")}>
            <SelectTrigger id="group-choice" className="w-52">
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
        <Button type="submit" disabled={busy}>
          Vincular
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void submit("unassign")}>
          Remover do grupo
        </Button>
      </Toolbar>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
    </form>
  );
}

function peopleLabel(group: Group) {
  if (group.people.length === 0) return "—";
  return group.people
    .map((person) => {
      const role = person.role in ROLE_LABEL ? ROLE_LABEL[person.role as UserRole] : person.role;
      return `${person.name?.trim() || person.suapEnrollment} (${role})`;
    })
    .join(", ");
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

type NoticeState = { tone: "ok" | "error"; text: string };
