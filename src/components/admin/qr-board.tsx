"use client";

import { useEffect, useState } from "react";
import { QrImage } from "@/components/admin/qr-image";
import { AdminPage, EmptyRow, Field, Notice, StatusBadge, Toolbar } from "@/components/admin/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createQrCode, listQrCodes, updateQrCodeStatus, type QrCode } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

export function QrBoard() {
  const [codes, setCodes] = useState<QrCode[]>([]);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  async function reload() {
    setCodes(await listQrCodes());
  }

  useEffect(() => {
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
  }, []);

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
          <Field label="Local" htmlFor="qr-location">
            <Input id="qr-location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </Field>
          <Button type="submit" disabled={busy}>
            Cadastrar
          </Button>
        </Toolbar>
      </form>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Local</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Acesso</TableHead>
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
                  <QrImage value={item.id} />
                </TableCell>
                <TableCell>
                  <StatusBadge active={item.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={item.status ? "outline" : "default"}
                    disabled={pendingId === item.id}
                    onClick={() => void changeStatus(item)}
                  >
                    {item.status ? "Desativar" : "Ativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </AdminPage>
  );
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

type NoticeState = { tone: "ok" | "error"; text: string };
