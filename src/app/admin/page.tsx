"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  authorizeEnrollment,
  logout,
  ROLE_LABEL,
  updateEnrollmentStatus,
  type ManagedUser,
  type UserRole,
} from "@/lib/api";
import { useSession } from "@/lib/use-session";

const ROLES: UserRole[] = ["ALUNO", "PRESTADOR", "SERVIDOR"];

export default function AdminPage() {
  const router = useRouter();
  const { user, phase, error } = useSession();
  const allowed = user?.role === "SERVIDOR";

  useEffect(() => {
    if (phase === "ready" && !allowed) router.replace("/");
  }, [allowed, phase, router]);

  if (phase === "loading" || !allowed) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-muted">
          {error ?? "Carregando sessão…"}
        </p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-brand">Sistema de pontos</p>
            <p className="text-sm text-muted">
              {user.name?.trim() || "Servidor"} · {user.suapEnrollment}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="h-10 rounded-full border border-line px-4 text-sm font-medium"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <AuthorizeCard />
        <StatusCard />
      </main>
    </div>
  );
}

function AuthorizeCard() {
  const [enrollment, setEnrollment] = useState("");
  const [role, setRole] = useState<UserRole>("ALUNO");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

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
    <section className="rounded-2xl border border-line bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Autorizar matrícula</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        A matrícula fica liberada para entrar. No primeiro login, o SUAP
        preenche nome, foto e papel.
      </p>
      <label className="mt-5 block text-sm font-medium" htmlFor="authorize-enrollment">
        Matrícula
      </label>
      <input
        id="authorize-enrollment"
        value={enrollment}
        onChange={(event) => setEnrollment(event.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        className="mt-2 h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-brand"
      />
      <label className="mt-4 block text-sm font-medium" htmlFor="authorize-role">
        Papel
      </label>
      <select
        id="authorize-role"
        value={role}
        onChange={(event) => setRole(event.target.value as UserRole)}
        className="mt-2 h-11 w-full rounded-xl border border-line bg-card px-3 outline-none focus:border-brand"
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>
            {ROLE_LABEL[item]}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-5 h-11 rounded-full bg-brand px-5 text-sm font-medium text-white disabled:opacity-60"
      >
        Autorizar
      </button>
      <Feedback notice={notice} />
    </section>
  );
}

function StatusCard() {
  const [enrollment, setEnrollment] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ManagedUser | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function save(status: boolean) {
    const suapEnrollment = enrollment.trim();
    if (!suapEnrollment) {
      setResult(null);
      setNotice({ tone: "error", text: "Informe a matrícula." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const next = await updateEnrollmentStatus(suapEnrollment, status);
      setResult(next);
      setNotice({
        tone: "ok",
        text: status ? "Usuário ativado." : "Usuário desativado.",
      });
    } catch (caught) {
      setResult(null);
      setNotice({ tone: "error", text: messageOf(caught) });
    } finally {
      setBusy(false);
    }
  }

  const confirmed = result !== null && result.suapEnrollment === enrollment.trim();

  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Situação</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Não há lista de usuários. Informe a matrícula do SUAP.
      </p>
      <label className="mt-5 block text-sm font-medium" htmlFor="status-enrollment">
        Matrícula
      </label>
      <input
        id="status-enrollment"
        value={enrollment}
        onChange={(event) => {
          setEnrollment(event.target.value);
          setNotice(null);
          if (result && event.target.value.trim() !== result.suapEnrollment) {
            setResult(null);
          }
        }}
        autoCapitalize="none"
        autoCorrect="off"
        className="mt-2 h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-brand"
      />
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(true)}
          className={`h-11 rounded-full px-5 text-sm font-medium disabled:opacity-60 ${
            confirmed && result.status
              ? "bg-brand text-white"
              : "border border-line"
          }`}
        >
          Ativar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className={`h-11 rounded-full px-5 text-sm font-medium disabled:opacity-60 ${
            confirmed && !result.status
              ? "bg-danger text-white"
              : "border border-line"
          }`}
        >
          Desativar
        </button>
      </div>
      {confirmed ? (
        <p className="mt-4 text-sm text-muted">
          {result.suapEnrollment} · {labelOf(result.role)} ·{" "}
          {result.status ? "Ativo" : "Inativo"}
        </p>
      ) : null}
      <Feedback notice={notice} />
    </section>
  );
}

function Feedback({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const tone =
    notice.tone === "ok"
      ? "mt-4 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand"
      : "mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger";
  return <p className={tone}>{notice.text}</p>;
}

function labelOf(role: string) {
  return role in ROLE_LABEL ? ROLE_LABEL[role as UserRole] : role;
}

function messageOf(caught: unknown) {
  return caught instanceof ApiError
    ? caught.message
    : "Não foi possível concluir a operação.";
}

type Notice = { tone: "ok" | "error"; text: string };
