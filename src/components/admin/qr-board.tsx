"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { QrImage } from "@/components/admin/qr-image";
import { AdminPage, EmptyRow, Notice, StatusBadge, Toolbar } from "@/components/admin/page-frame";
import { ActionButton } from "@/components/form/action-button";
import { TextField } from "@/components/form/text-field";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  createQrCode,
  deleteQrCode,
  listQrCodes,
  updateQrCode,
  updateQrCodeStatus,
  type QrCode,
} from "@/lib/admin-api";
import { useCanManage } from "@/components/admin/panel-user";
import { ApiError } from "@/lib/api";

export function QrBoard() {
  const manage = useCanManage();
  const [codes, setCodes] = useState<QrCode[]>([]);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [editing, setEditing] = useState<QrCode | null>(null);
  const [removing, setRemoving] = useState<QrCode | null>(null);

  async function reload() {
    setCodes(await listQrCodes());
  }

  useEffect(() => {
    if (!manage) {
      setLoading(false);
      return;
    }
    let active = true;
    listQrCodes()
      .then((rows) => {
        if (active) setCodes(rows);
      })
      .catch((caught: unknown) => {
        if (active) setNotice({ tone: "error", text: messageOf(caught, "Não foi possível carregar os QR codes.") });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [manage]);

  async function create() {
    if (!location.trim()) {
      setNotice({ tone: "error", text: "Informe o local." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await createQrCode(location.trim());
      setLocation("");
      await reload();
      setNotice({ tone: "ok", text: "QR code cadastrado." });
    } catch (caught) {
      setNotice({ tone: "error", text: messageOf(caught, "Não foi possível cadastrar o QR code.") });
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(item: QrCode) {
    setPendingId(item.id);
    setNotice(null);
    try {
      const next = await updateQrCodeStatus(item.id, !item.status);
      setCodes((current) => current.map((code) => (code.id === next.id ? next : code)));
      setNotice({ tone: "ok", text: next.status ? "QR code ativado." : "QR code desativado." });
    } catch (caught) {
      setNotice({ tone: "error", text: messageOf(caught, "Não foi possível atualizar o QR code.") });
    } finally {
      setPendingId(null);
    }
  }

  async function saveLocation(item: QrCode, location: string) {
    setPendingId(item.id);
    try {
      const next = await updateQrCode(item.id, location);
      setCodes((current) => current.map((code) => (code.id === next.id ? next : code)));
      setEditing(null);
      setNotice({ tone: "ok", text: "QR code atualizado." });
    } finally {
      setPendingId(null);
    }
  }

  async function remove(item: QrCode) {
    setPendingId(item.id);
    setNotice(null);
    try {
      await deleteQrCode(item.id);
      setCodes((current) => current.filter((code) => code.id !== item.id));
      setRemoving(null);
      setNotice({ tone: "ok", text: "QR code excluído." });
    } catch (caught) {
      setNotice({ tone: "error", text: messageOf(caught, "Não foi possível excluir o QR code.") });
      setRemoving(null);
    } finally {
      setPendingId(null);
    }
  }

  if (!manage) {
    return (
      <AdminPage
        title="QR codes"
        description="O código libera a batida de ponto. Esta conta não consulta nem baixa QR codes."
      >
        <p className="text-sm text-muted-foreground">Peça a um servidor para cuidar dos QR codes.</p>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="QR codes"
      description="Informe o local. O código usado na batida é gerado automaticamente."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <Toolbar>
          <TextField
            id="qr-location"
            label="Local"
            value={location}
            onValueChange={setLocation}
            placeholder="Informe o local que do QR Code"
            className="w-2xs"
          />
          <ActionButton type="submit" disabled={busy}>
            Cadastrar
          </ActionButton>
        </Toolbar>
      </form>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Local</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <EmptyRow colSpan={4}>Carregando QR codes…</EmptyRow>
          ) : codes.length === 0 ? (
            <EmptyRow colSpan={4}>Nenhum QR code cadastrado.</EmptyRow>
          ) : (
            codes.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.location}</TableCell>
                <TableCell>
                  <QrPreview item={item} canDownload />
                </TableCell>
                <TableCell>
                  <StatusBadge active={item.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      size="sm"
                      intent={item.status ? "outline" : "primary"}
                      disabled={pendingId === item.id}
                      onClick={() => void changeStatus(item)}
                    >
                      {item.status ? "Desativar" : "Ativar"}
                    </ActionButton>
                    <ActionButton size="sm" intent="outline" disabled={pendingId === item.id} onClick={() => setEditing(item)}>
                      Editar
                    </ActionButton>
                    <ActionButton size="sm" intent="danger" disabled={pendingId === item.id} onClick={() => setRemoving(item)}>
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
        <EditQrDialog
          key={editing.id}
          item={editing}
          busy={pendingId === editing.id}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSave={(location) => saveLocation(editing, location)}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        title="Excluir QR code"
        description={
          removing
            ? `Excluir o QR code de ${removing.location}? Códigos já usados em registros de ponto não podem ser excluídos.`
            : ""
        }
        busy={pendingId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        onConfirm={() => {
          if (removing) void remove(removing);
        }}
      />
    </AdminPage>
  );
}

function EditQrDialog({
  item,
  busy,
  onOpenChange,
  onSave,
}: {
  item: QrCode;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (location: string) => Promise<void>;
}) {
  const [location, setLocation] = useState(item.location);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar QR code</DialogTitle>
          <DialogDescription>O código impresso continua o mesmo. Só o local muda.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!location.trim()) {
              setFormError("Informe o local.");
              return;
            }
            setFormError(null);
            try {
              await onSave(location.trim());
            } catch (caught) {
              setFormError(messageOf(caught, "Não foi possível editar o QR code."));
            }
          }}
        >
          <TextField id="edit-qr-location" label="Local" value={location} onValueChange={setLocation} />
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

function QrPreview({ item, canDownload }: { item: QrCode; canDownload: boolean }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  function download() {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = qrFileName(item.location);
    link.click();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSrc(null);
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Ver código
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item.location}</DialogTitle>
          <DialogDescription>Escaneie este código para registrar o ponto neste local.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          {open ? (
            <QrImage
              value={item.id}
              size={512}
              alt={`QR code de ${item.location}`}
              className="size-64"
              onReady={setSrc}
            />
          ) : null}
        </div>
        {canDownload ? (
          <DialogFooter>
            <ActionButton intent="outline" onClick={download} disabled={!src}>
              Baixar imagem
            </ActionButton>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function qrFileName(location: string) {
  const slug = location
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `qr-${slug || "codigo"}.png`;
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

type NoticeState = { tone: "ok" | "error"; text: string };
