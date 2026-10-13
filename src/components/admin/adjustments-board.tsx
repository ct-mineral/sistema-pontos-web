"use client";

import { useEffect, useState } from "react";
import { AdminPage, EmptyRow, Field, Notice, Toolbar } from "@/components/admin/page-frame";
import { Badge } from "@/components/ui/badge";
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
  createAdjustment,
  listAdjustments,
  listGroups,
  type Group,
  type WorkloadAdjustment,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatDay, formatSchedule, fortalezaToday } from "@/lib/schedule";

export function AdjustmentsBoard() {
  const [items, setItems] = useState<WorkloadAdjustment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const today = fortalezaToday();

  async function reload(enrollment = filter) {
    const [next, groupList] = await Promise.all([
      listAdjustments(enrollment.trim() || undefined),
      listGroups(),
    ]);
    setItems(next);
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
      description="O horário vale para o grupo escolhido. A data final é opcional. Sem ela, o ajuste segue em aberto."
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
          <Field label="Filtrar matrícula" htmlFor="adjustment-filter">
            <Input
              id="adjustment-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Field>
          <Button type="submit" disabled={loading}>
            Aplicar
          </Button>
        </Toolbar>
      </form>
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
          } finally {
            setBusy(false);
          }
        }}
      />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matrícula</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <EmptyRow colSpan={6}>Carregando ajustes…</EmptyRow>
          ) : items.length === 0 ? (
            <EmptyRow colSpan={6}>Nenhum ajuste cadastrado.</EmptyRow>
          ) : (
            items.map((item) => {
              const state = adjustmentState(item, today);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.suapEnrollment}</TableCell>
                  <TableCell>{item.groupName ?? "—"}</TableCell>
                  <TableCell>{formatSchedule(item.startTime, item.endTime, item.dailyWorkloadMinutes)}</TableCell>
                  <TableCell>{formatDay(item.startDate)}</TableCell>
                  <TableCell>{item.endDate ? formatDay(item.endDate) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={state === "closed" ? "outline" : "secondary"}>
                      {state === "open" ? "Em aberto" : state === "scheduled" ? "Agendado" : "Encerrado"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </AdminPage>
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
    startTime: string;
    endTime: string;
    startDate: string;
    endDate?: string;
  }) => Promise<void>;
}) {
  const [enrollment, setEnrollment] = useState("");
  const [groupId, setGroupId] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!enrollment.trim() || !groupId || !startDate || !startTime || !endTime) {
          setFormError("Informe a matrícula, o grupo, o horário e a data de início.");
          return;
        }
        if (endTime <= startTime) {
          setFormError("A saída precisa ser depois da entrada.");
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
          startTime,
          endTime,
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
        <Field label="Matrícula" htmlFor="adjustment-enrollment">
          <Input
            id="adjustment-enrollment"
            value={enrollment}
            onChange={(event) => setEnrollment(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>
        <Field label="Grupo" htmlFor="adjustment-group">
          <Select value={groupId || null} onValueChange={(value) => setGroupId(value ?? "")}>
            <SelectTrigger id="adjustment-group" className="w-52">
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
        <Field label="Entrada" htmlFor="adjustment-start">
          <Input
            id="adjustment-start"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </Field>
        <Field label="Saída" htmlFor="adjustment-end">
          <Input id="adjustment-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </Field>
        <Field label="Início" htmlFor="adjustment-from">
          <Input id="adjustment-from" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </Field>
        <Field label="Fim" htmlFor="adjustment-to">
          <Input id="adjustment-to" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>
          Cadastrar ajuste
        </Button>
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
