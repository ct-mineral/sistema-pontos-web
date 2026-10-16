"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  AdminPage,
  EmptyRow,
  Notice,
  StatusBadge,
  Toolbar,
} from "@/components/admin/page-frame";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiError,
  authorizeEnrollment,
  deleteEnrollment,
  listEnrollments,
  ROLE_LABEL,
  updateEnrollment,
  updateEnrollmentStatus,
  type ManagedUser,
  type UserRole,
} from "@/lib/api";
import { useSession } from "@/lib/use-session";

export function EnrollmentBoard() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [removing, setRemoving] = useState<ManagedUser | null>(null);
  const { user: session } = useSession();

  useEffect(() => {
    let active = true;
    listEnrollments()
      .then((rows) => {
        if (active) setUsers(rows);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(messageOf(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function changeStatus(user: ManagedUser, status: boolean) {
    setPendingId(user.id);
    setLoadError(null);
    try {
      const next = await updateEnrollmentStatus(user.suapEnrollment, status);
      setUsers((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
    } catch (caught) {
      setLoadError(messageOf(caught));
    } finally {
      setPendingId(null);
    }
  }

  async function remove(user: ManagedUser) {
    setPendingId(user.id);
    setLoadError(null);
    try {
      await deleteEnrollment(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setRemoving(null);
    } catch (caught) {
      setLoadError(messageOf(caught));
      setRemoving(null);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AdminPage
      title="Matrículas"
      description="Autorize uma matrícula para liberar o acesso. O papel vem do SUAP no primeiro login e aparece na tabela."
    >
      <AuthorizeForm
        onCreated={(created) =>
          setUsers((current) => [
            created,
            ...current.filter((item) => item.id !== created.id),
          ])
        }
      />
      {loadError ? <Notice tone="error">{loadError}</Notice> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matrícula</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <EmptyRow colSpan={5}>Carregando matrículas…</EmptyRow>
          ) : users.length === 0 ? (
            <EmptyRow colSpan={5}>Nenhuma matrícula autorizada.</EmptyRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.suapEnrollment}
                </TableCell>
                <TableCell>{user.name?.trim() || "—"}</TableCell>
                <TableCell>{labelOf(user.role)}</TableCell>
                <TableCell>
                  <StatusBadge active={user.status} off="Desativado" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      size="sm"
                      intent={user.status ? "outline" : "primary"}
                      disabled={pendingId === user.id}
                      onClick={() => void changeStatus(user, !user.status)}
                    >
                      {user.status ? "Desativar" : "Ativar"}
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      intent="outline"
                      disabled={pendingId === user.id}
                      onClick={() => setEditing(user)}
                    >
                      Editar
                    </ActionButton>
                    {session?.id === user.id ? null : (
                      <ActionButton
                        size="sm"
                        intent="danger"
                        disabled={pendingId === user.id}
                        onClick={() => setRemoving(user)}
                      >
                        Excluir
                      </ActionButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {editing ? (
        <EditEnrollmentDialog
          key={editing.id}
          user={editing}
          busy={pendingId === editing.id}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSave={async (suapEnrollment) => {
            setPendingId(editing.id);
            try {
              const next = await updateEnrollment(editing.id, suapEnrollment);
              setUsers((current) =>
                current.map((item) => (item.id === next.id ? next : item)),
              );
              setEditing(null);
            } finally {
              setPendingId(null);
            }
          }}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        title="Excluir matrícula"
        description={
          removing
            ? `Excluir a matrícula ${removing.suapEnrollment}? Vínculos e ajustes dessa matrícula também saem. Matrículas com ponto registrado não podem ser excluídas.`
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

function AuthorizeForm({
  onCreated,
}: {
  onCreated: (user: ManagedUser) => void;
}) {
  const [enrollment, setEnrollment] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  async function submit() {
    const suapEnrollment = enrollment.trim();
    if (!suapEnrollment) {
      setNotice({ tone: "error", text: "Informe a matrícula." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const created = await authorizeEnrollment(suapEnrollment);
      onCreated(created);
      setEnrollment("");
      setNotice({
        tone: "ok",
        text: `${created.suapEnrollment} autorizada. O papel aparece após o primeiro acesso pelo SUAP.`,
      });
    } catch (caught) {
      setNotice({ tone: "error", text: messageOf(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Toolbar>
        <TextField
          id="authorize-enrollment"
          label="Matrícula"
          value={enrollment}
          onValueChange={setEnrollment}
          placeholder="Informe a matrícula do usuário"
          className="w-2xs"
        />
        <ActionButton type="submit" disabled={busy}>
          Autorizar
        </ActionButton>
      </Toolbar>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </form>
  );
}

function EditEnrollmentDialog({
  user,
  busy,
  onOpenChange,
  onSave,
}: {
  user: ManagedUser;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (suapEnrollment: string) => Promise<void>;
}) {
  const [enrollment, setEnrollment] = useState(user.suapEnrollment);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar matrícula</DialogTitle>
          <DialogDescription>
            O nome e o papel continuam vindo do SUAP.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const suapEnrollment = enrollment.trim();
            if (!suapEnrollment) {
              setFormError("Informe a matrícula.");
              return;
            }
            setFormError(null);
            try {
              await onSave(suapEnrollment);
            } catch (caught) {
              setFormError(messageOf(caught));
            }
          }}
        >
          <TextField id="edit-enrollment" label="Matrícula" value={enrollment} onValueChange={setEnrollment} />
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

function labelOf(role: string | null) {
  if (!role) return "Aguardando acesso";
  return role in ROLE_LABEL ? ROLE_LABEL[role as UserRole] : role;
}

function messageOf(caught: unknown) {
  return caught instanceof ApiError
    ? caught.message
    : "Não foi possível concluir a operação.";
}

type NoticeState = { tone: "ok" | "error"; text: string };
