"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ActivityReportDialog } from "@/components/admin/activity-report-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { GroupScheduleDialog } from "@/components/admin/group-schedule-dialog";
import { AdminPage, EmptyRow, Notice, StatusBadge, Toolbar } from "@/components/admin/page-frame";
import { ActionButton } from "@/components/form/action-button";
import { TextField } from "@/components/form/text-field";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  deleteGroup,
  listGroups,
  unassignGroup,
  updateGroup,
  updateGroupStatus,
  type Group,
  type GroupPerson,
} from "@/lib/admin-api";
import { useCanManage } from "@/components/admin/panel-user";
import { ApiError, ROLE_LABEL } from "@/lib/api";
import { formatDateTime, formatMinutes, peopleCountLabel, scheduleRange, shiftLabel } from "@/lib/schedule";

export function GroupDetail() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const router = useRouter();
  const manage = useCanManage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [reportFor, setReportFor] = useState<GroupPerson | null>(null);

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
        if (active) setNotice({ tone: "error", text: messageOf(caught, "Não foi possível carregar o grupo.") });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const group = groups.find((item) => item.id === groupId) ?? null;

  if (loading) {
    return (
      <AdminPage title="Grupo" description="Carregando as informações do grupo." back={{ href: "/admin/grupos", label: "Grupos" }}>
        <p className="text-sm text-muted-foreground">Carregando grupo…</p>
      </AdminPage>
    );
  }

  if (!group) {
    return (
      <AdminPage
        title="Grupo não encontrado"
        description="Esse grupo não está mais disponível."
        back={{ href: "/admin/grupos", label: "Grupos" }}
      >
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      </AdminPage>
    );
  }

  const shift = shiftLabel(group.startTime);

  async function changeStatus() {
    if (!group) return;
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
      title={group.name}
      description="Horário, carga diária e pessoas vinculadas a este grupo."
      back={{ href: "/admin/grupos", label: "Grupos" }}
    >
      {manage ? (
        <div className="flex flex-wrap gap-2">
          <ActionButton intent="outline" disabled={busy} onClick={() => setEditing(true)}>
            Editar
          </ActionButton>
          <ActionButton intent={group.status ? "outline" : "primary"} disabled={busy} onClick={() => void changeStatus()}>
            {group.status ? "Desativar" : "Ativar"}
          </ActionButton>
          <ActionButton intent="danger" disabled={busy} onClick={() => setRemoving(true)}>
            Excluir
          </ActionButton>
        </div>
      ) : null}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Entrada e saída" value={scheduleRange(group.startTime, group.endTime)} />
        <Fact label="Intervalo" value={group.breakStartTime && group.breakEndTime ? `${group.breakStartTime}–${group.breakEndTime}` : "Não informado"} />
        <Fact label="Carga diária" value={`${formatMinutes(group.dailyWorkloadMinutes)} por dia`} />
        <Fact label="Turno" value={shift ?? "—"} />
        <Fact label="Status" value={<StatusBadge active={group.status} />} />
        <Fact label="Pessoas" value={peopleCountLabel(group.members)} />
        <Fact label="Cadastrado em" value={formatDateTime(group.createdAt)} />
        <Fact label="Atualizado em" value={formatDateTime(group.updatedAt)} />
      </div>
      <section className="flex flex-col gap-3">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">Pessoas</h2>
          <p className="text-sm text-muted-foreground">
            {peopleCountLabel(group.people.length)} neste grupo. Uma matrícula pode participar de vários grupos, um por turno.
          </p>
        </header>
        {manage ? (
          group.status ? (
            <MembershipForm
              busy={busy}
              onAssign={async (enrollment) => {
                setBusy(true);
                setNotice(null);
                try {
                  await assignGroup(enrollment, group.id);
                  await reload();
                  setNotice({ tone: "ok", text: "Usuário vinculado ao grupo." });
                } catch (caught) {
                  setNotice({ tone: "error", text: messageOf(caught, "Não foi possível vincular a matrícula.") });
                  throw caught;
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Ative o grupo para vincular novas matrículas.</p>
          )
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.people.length === 0 ? (
              <EmptyRow colSpan={4}>Nenhuma pessoa vinculada.</EmptyRow>
            ) : (
              group.people.map((person) => (
                <TableRow key={person.suapEnrollment}>
                  <TableCell className="font-medium">{person.name?.trim() || "—"}</TableCell>
                  <TableCell>{person.suapEnrollment}</TableCell>
                  <TableCell>{roleLabel(person.role)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ActionButton
                        size="sm"
                        intent="outline"
                        disabled={busy}
                        onClick={() => setReportFor(person)}
                      >
                        Relatório
                      </ActionButton>
                      {manage ? (
                        <ActionButton
                          size="sm"
                          intent="danger-soft"
                          disabled={busy}
                          onClick={() => {
                            setBusy(true);
                            setNotice(null);
                            unassignGroup(person.suapEnrollment, group.id)
                              .then(async () => {
                                await reload();
                                setNotice({ tone: "ok", text: "Usuário removido do grupo." });
                              })
                              .catch((caught: unknown) => {
                                setNotice({ tone: "error", text: messageOf(caught, "Não foi possível remover a matrícula do grupo.") });
                              })
                              .finally(() => setBusy(false));
                          }}
                        >
                          Remover
                        </ActionButton>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
      {editing ? (
        <GroupScheduleDialog
          key={group.id}
          title="Editar grupo"
          description="Altere o horário de trabalho e o intervalo deste grupo."
          initial={{
            name: group.name,
            startTime: group.startTime ?? "08:00",
            endTime: group.endTime ?? "12:00",
            breakStartTime: group.breakStartTime ?? "",
            breakEndTime: group.breakEndTime ?? "",
          }}
          busy={busy}
          submitLabel="Salvar"
          onOpenChange={() => setEditing(false)}
          onSave={async (input) => {
            setBusy(true);
            try {
              await updateGroup(group.id, input.name, input.startTime, input.endTime, input.breakStartTime, input.breakEndTime);
              await reload();
              setEditing(false);
              setNotice({ tone: "ok", text: "Grupo atualizado." });
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
      {reportFor ? (
        <ActivityReportDialog
          person={reportFor}
          group={group}
          onOpenChange={(open) => {
            if (!open) setReportFor(null);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={removing}
        title="Excluir grupo"
        description={`Excluir o grupo ${group.name}? Os vínculos saem junto. Grupos com ponto ou ajuste de carga não podem ser excluídos.`}
        busy={busy}
        onOpenChange={setRemoving}
        onConfirm={() => {
          setBusy(true);
          setNotice(null);
          deleteGroup(group.id)
            .then(() => {
              router.push("/admin/grupos");
            })
            .catch((caught: unknown) => {
              setNotice({ tone: "error", text: messageOf(caught, "Não foi possível excluir o grupo.") });
              setRemoving(false);
            })
            .finally(() => setBusy(false));
        }}
      />
    </AdminPage>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function MembershipForm({
  busy,
  onAssign,
}: {
  busy: boolean;
  onAssign: (enrollment: string) => Promise<void>;
}) {
  const [enrollment, setEnrollment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!enrollment.trim()) {
          setFormError("Informe a matrícula.");
          return;
        }
        setFormError(null);
        void onAssign(enrollment.trim())
          .then(() => setEnrollment(""))
          .catch(() => undefined);
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
        <ActionButton type="submit" disabled={busy}>
          Vincular
        </ActionButton>
      </Toolbar>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
    </form>
  );
}

function roleLabel(role: GroupPerson["role"]) {
  return role ? ROLE_LABEL[role] : "Aguardando acesso";
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

type NoticeState = { tone: "ok" | "error"; text: string };
