"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { GroupScheduleDialog } from "@/components/admin/group-schedule-dialog";
import { AdminPage, Notice, StatusBadge } from "@/components/admin/page-frame";
import { ActionButton } from "@/components/form/action-button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createGroup, listGroups, type Group } from "@/lib/admin-api";
import { useCanManage } from "@/components/admin/panel-user";
import { ApiError } from "@/lib/api";
import { formatMinutes, peopleCountLabel } from "@/lib/schedule";

export function GroupsBoard() {
  const manage = useCanManage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    listGroups()
      .then((rows) => {
        if (active) setGroups(rows);
      })
      .catch((caught: unknown) => {
        if (active)
          setNotice({
            tone: "error",
            text: messageOf(caught, "Não foi possível carregar os grupos."),
          });
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
      description="Escolha um grupo para ver a carga diária e as pessoas vinculadas."
    >
      {manage ? (
        <div className="flex justify-end">
          <ActionButton disabled={busy} onClick={() => setCreating(true)}>
            Cadastrar grupo
          </ActionButton>
        </div>
      ) : null}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando grupos…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          Nenhum grupo cadastrado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
      {creating ? (
        <GroupScheduleDialog
          title="Cadastrar grupo"
          description="Informe a carga horária diária do grupo."
          initial={{
            name: "",
            dailyWorkloadMinutes: 480,
          }}
          busy={busy}
          submitLabel="Cadastrar"
          onOpenChange={() => setCreating(false)}
          onSave={async (input) => {
            setBusy(true);
            setNotice(null);
            try {
              const created = await createGroup(input.name, input.dailyWorkloadMinutes);
              setGroups((current) => [
                created,
                ...current.filter((group) => group.id !== created.id),
              ]);
              setCreating(false);
              setNotice({ tone: "ok", text: "Grupo cadastrado." });
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </AdminPage>
  );
}

function GroupCard({ group }: { group: Group }) {
  const preview = group.people
    .slice(0, 3)
    .map((person) => person.name?.trim() || person.suapEnrollment);
  const extra = group.people.length - preview.length;

  return (
    <Link
      href={`/admin/grupos/${group.id}`}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
          <CardAction>
            <StatusBadge active={group.status} />
          </CardAction>
          <CardDescription>Carga horária diária</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {formatMinutes(group.dailyWorkloadMinutes)} por dia
        </CardContent>
        <CardFooter>
          <div className="flex flex-col items-start gap-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Users className="size-3.5" />
              {peopleCountLabel(group.members)}
            </span>
            <span className="text-muted-foreground">
              {preview.length === 0
                ? "Nenhuma pessoa vinculada."
                : `${preview.join(", ")}${extra > 0 ? ` e mais ${extra}` : ""}`}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

type NoticeState = { tone: "ok" | "error"; text: string };
