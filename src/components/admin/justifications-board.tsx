"use client";

import { useEffect, useState } from "react";
import { AdminPage, EmptyRow, Notice } from "@/components/admin/page-frame";
import { ActionButton } from "@/components/form/action-button";
import { TextField } from "@/components/form/text-field";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  JUSTIFICATION_LABEL,
  listJustifications,
  reviewJustification,
  type EarlyExitJustification,
  type JustificationStatus,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatDay, formatTime } from "@/lib/schedule";
import { useSession } from "@/lib/use-session";

export function JustificationsBoard() {
  const { user } = useSession();
  const [items, setItems] = useState<EarlyExitJustification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [partial, setPartial] = useState<EarlyExitJustification | null>(null);
  const [makeupDate, setMakeupDate] = useState("");
  const [makeupStart, setMakeupStart] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    listJustifications()
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setNotice({
          tone: "error",
          text: caught instanceof ApiError ? caught.message : "Não foi possível carregar as justificativas.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function decide(
    id: string,
    status: "APROVADA" | "APROVADA_PARCIAL" | "RECUSADA",
    makeup?: { makeupDate: string; makeupStart: string },
  ) {
    setBusyId(id);
    setNotice(null);
    try {
      const updated = await reviewJustification(id, status, makeup);
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      setPartial(null);
      setNotice({
        tone: "ok",
        text:
          status === "APROVADA"
            ? "Justificativa aprovada. O expediente foi completado."
            : status === "APROVADA_PARCIAL"
              ? "Justificativa aprovada parcialmente. O acerto ficou marcado."
              : "Justificativa recusada. A saída volta para o leitor.",
      });
    } catch (caught) {
      setNotice({
        tone: "error",
        text: caught instanceof ApiError ? caught.message : "Não foi possível analisar a justificativa.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const rows = [...items].sort((left, right) => rank(left) - rank(right));

  return (
    <AdminPage
      title="Justificativas"
      description="Saídas feitas antes do fim do grupo. Outro servidor precisa aprovar ou recusar o motivo."
    >
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matrícula</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Saída</TableHead>
            <TableHead>Fim previsto</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Análise</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <EmptyRow colSpan={8}>Carregando justificativas…</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={8}>Nenhuma saída antecipada registrada.</EmptyRow>
          ) : (
            rows.map((item) => {
              const own = user?.id === item.userId;
              const open = item.status === "PENDENTE" && Boolean(item.reason?.trim());
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.suapEnrollment}</TableCell>
                  <TableCell>{item.name?.trim() || "Sem nome"}</TableCell>
                  <TableCell>{item.groupName ?? "Sem grupo"}</TableCell>
                  <TableCell>{formatTime(item.recordedAt)}</TableCell>
                  <TableCell>{item.scheduledEnd}</TableCell>
                  <TableCell className="max-w-xs whitespace-pre-wrap">
                    {item.reason?.trim() || "Aguardando motivo"}
                  </TableCell>
                  <TableCell>
                    <JustificationBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    {open ? (
                      <div className="flex flex-col items-start gap-2">
                        <div className="flex gap-2">
                          <ActionButton
                            size="sm"
                            disabled={busyId === item.id || own}
                            onClick={() => void decide(item.id, "APROVADA")}
                          >
                            Aprovar
                          </ActionButton>
                          <ActionButton
                            size="sm"
                            intent="outline"
                            disabled={busyId === item.id || own}
                            onClick={() => {
                              setMakeupDate("");
                              setMakeupStart("");
                              setPartial(item);
                            }}
                          >
                            Aprovar parcialmente
                          </ActionButton>
                          <ActionButton
                            size="sm"
                            intent="danger"
                            disabled={busyId === item.id || own}
                            onClick={() => void decide(item.id, "RECUSADA")}
                          >
                            Recusar
                          </ActionButton>
                        </div>
                        {own ? (
                          <p className="text-xs text-muted-foreground">
                            Outro servidor precisa analisar esta justificativa.
                          </p>
                        ) : null}
                      </div>
                    ) : item.status === "APROVADA_PARCIAL" && item.makeupDate && item.makeupStart && item.makeupEnd ? (
                      <p className="text-sm text-muted-foreground">
                        Acerto em {formatDay(item.makeupDate)}, das {item.makeupStart} às {item.makeupEnd}
                      </p>
                    ) : item.reviewerName ? (
                      <p className="text-sm text-muted-foreground">{item.reviewerName}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aguardando motivo</p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <Dialog open={partial !== null} onOpenChange={(open) => !open && setPartial(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar parcialmente</DialogTitle>
            <DialogDescription>
              Informe o dia e o horário em que as horas restantes serão cumpridas. O fim é calculado a
              partir da saída.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!partial) return;
              void decide(partial.id, "APROVADA_PARCIAL", { makeupDate, makeupStart });
            }}
          >
            <TextField id="makeup-date" label="Data" type="date" value={makeupDate} onValueChange={setMakeupDate} required />
            <TextField
              id="makeup-start"
              label="Horário de início"
              type="time"
              value={makeupStart}
              onValueChange={setMakeupStart}
              required
            />
            <DialogFooter>
              <ActionButton intent="outline" onClick={() => setPartial(null)}>
                Cancelar
              </ActionButton>
              <ActionButton type="submit" disabled={busyId === partial?.id}>
                Confirmar
              </ActionButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function rank(item: EarlyExitJustification) {
  if (item.status === "PENDENTE" && item.reason?.trim()) return 0;
  if (item.status === "PENDENTE") return 1;
  return 2;
}

export function JustificationBadge({ status }: { status: JustificationStatus }) {
  const variant =
    status === "RECUSADA" ? "destructive" : status === "APROVADA" ? "default" : status === "APROVADA_PARCIAL" ? "outline" : "secondary";
  return <Badge variant={variant}>{JUSTIFICATION_LABEL[status]}</Badge>;
}
