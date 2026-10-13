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
  ApiError,
  authorizeEnrollment,
  listEnrollments,
  ROLE_LABEL,
  updateEnrollmentStatus,
  type ManagedUser,
  type UserRole,
} from "@/lib/api";

const ROLES: UserRole[] = ["ALUNO", "PRESTADOR", "SERVIDOR"];

export function EnrollmentBoard() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

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
      setUsers((current) => current.map((item) => (item.id === next.id ? next : item)));
    } catch (caught) {
      setLoadError(messageOf(caught));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AdminPage
      title="Matrículas"
      description="Autorize uma matrícula e acompanhe quem pode entrar. O status e o acesso ficam em cada linha."
    >
      <AuthorizeForm
        onCreated={(created) =>
          setUsers((current) => [created, ...current.filter((item) => item.id !== created.id)])
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
            <TableHead className="text-right">Acesso</TableHead>
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
                <TableCell className="font-medium">{user.suapEnrollment}</TableCell>
                <TableCell>{user.name?.trim() || "—"}</TableCell>
                <TableCell>{labelOf(user.role)}</TableCell>
                <TableCell>
                  <StatusBadge active={user.status} off="Desativado" />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={user.status ? "outline" : "default"}
                    disabled={pendingId === user.id}
                    onClick={() => void changeStatus(user, !user.status)}
                  >
                    {user.status ? "Desativar" : "Ativar"}
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

function AuthorizeForm({ onCreated }: { onCreated: (user: ManagedUser) => void }) {
  const [enrollment, setEnrollment] = useState("");
  const [role, setRole] = useState<UserRole>("ALUNO");
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
      const created = await authorizeEnrollment(suapEnrollment, role);
      onCreated(created);
      setEnrollment("");
      setNotice({
        tone: "ok",
        text: `${created.suapEnrollment} autorizada como ${labelOf(created.role)}.`,
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
        <Field label="Matrícula" htmlFor="authorize-enrollment">
          <Input
            id="authorize-enrollment"
            value={enrollment}
            onChange={(event) => setEnrollment(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>
        <Field label="Papel" htmlFor="authorize-role">
          <Select value={role} onValueChange={(value) => value && setRole(value as UserRole)}>
            <SelectTrigger id="authorize-role" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {ROLE_LABEL[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" disabled={busy}>
          Autorizar
        </Button>
      </Toolbar>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </form>
  );
}

function labelOf(role: string) {
  return role in ROLE_LABEL ? ROLE_LABEL[role as UserRole] : role;
}

function messageOf(caught: unknown) {
  return caught instanceof ApiError ? caught.message : "Não foi possível concluir a operação.";
}

type NoticeState = { tone: "ok" | "error"; text: string };
