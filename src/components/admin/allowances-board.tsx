"use client";

import { useEffect, useState } from "react";
import { AdminPage, EmptyRow, Notice } from "@/components/admin/page-frame";
import { ActionButton } from "@/components/form/action-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ALLOWANCE_LABEL,
  listAllowances,
  reviewAllowance,
  type AllowanceStatus,
  type TimeAllowance,
} from "@/lib/admin-api";
import { useCanManage, usePanelUser } from "@/components/admin/panel-user";
import { ApiError } from "@/lib/api";
import { formatDay, minutesLabel } from "@/lib/schedule";

export function AllowancesBoard() {
  const user = usePanelUser();
  const manage = useCanManage();
  const [items, setItems] = useState<TimeAllowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    listAllowances()
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setNotice({
          tone: "error",
          text: caught instanceof ApiError ? caught.message : "Não foi possível carregar os abonos.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function decide(id: string, status: "APROVADO" | "RECUSADO") {
    setBusyId(id);
    setNotice(null);
    try {
      const updated = await reviewAllowance(id, status);
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      setNotice({
        tone: "ok",
        text: status === "APROVADO" ? "Abono aprovado. As horas entram no dia." : "Abono recusado.",
      });
    } catch (caught) {
      setNotice({
        tone: "error",
        text: caught instanceof ApiError ? caught.message : "Não foi possível analisar o abono.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const rows = [...items].sort((left, right) => rank(left) - rank(right));

  return (
    <AdminPage
      title="Abonos"
      description={
        manage
          ? "Horas que faltaram num dia. Outro servidor aprova ou recusa o pedido."
          : "Horas que faltaram num dia. Esta conta consulta os pedidos e não aprova nem recusa."
      }
    >
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matrícula</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Dia</TableHead>
            <TableHead>Minutos</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Análise</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <EmptyRow colSpan={8}>Carregando abonos…</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={8}>Nenhum abono solicitado.</EmptyRow>
          ) : (
            rows.map((item) => {
              const own = user?.id === item.userId;
              const open = item.status === "PENDENTE";
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.suapEnrollment}</TableCell>
                  <TableCell>{item.name?.trim() || "Sem nome"}</TableCell>
                  <TableCell>{item.groupName}</TableCell>
                  <TableCell>{formatDay(item.day)}</TableCell>
                  <TableCell>{minutesLabel(item.minutes)}</TableCell>
                  <TableCell className="max-w-xs whitespace-pre-wrap">
                    <p>{item.reason}</p>
                    <DocumentLinks allowanceId={item.id} documents={item.documents ?? []} />
                  </TableCell>
                  <TableCell>
                    <AllowanceBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    {open && manage ? (
                      <div className="flex flex-col items-start gap-2">
                        <div className="flex gap-2">
                          <ActionButton
                            size="sm"
                            disabled={busyId === item.id || own}
                            onClick={() => void decide(item.id, "APROVADO")}
                          >
                            Aprovar
                          </ActionButton>
                          <ActionButton
                            intent="danger"
                            size="sm"
                            disabled={busyId === item.id || own}
                            onClick={() => void decide(item.id, "RECUSADO")}
                          >
                            Recusar
                          </ActionButton>
                        </div>
                        {own ? (
                          <p className="text-xs text-muted-foreground">
                            Outro servidor precisa analisar este abono.
                          </p>
                        ) : null}
                      </div>
                    ) : open ? (
                      <p className="text-sm text-muted-foreground">Aguardando análise</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{item.reviewerName ?? "Analisado"}</p>
                    )}
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

function rank(item: TimeAllowance) {
  return item.status === "PENDENTE" ? 0 : 1;
}

function DocumentLinks({
  allowanceId,
  documents,
}: {
  allowanceId: string;
  documents: { id: string; fileName: string }[];
}) {
  if (documents.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {documents.map((document) => (
        <li key={document.id}>
          <a
            className="text-sm underline"
            href={`/api/time-records/allowances/${allowanceId}/documents/${document.id}`}
            target="_blank"
            rel="noreferrer"
          >
            {document.fileName}
          </a>
        </li>
      ))}
    </ul>
  );
}

function AllowanceBadge({ status }: { status: AllowanceStatus }) {
  const variant = status === "RECUSADO" ? "destructive" : status === "APROVADO" ? "default" : "secondary";
  return <Badge variant={variant}>{ALLOWANCE_LABEL[status]}</Badge>;
}
