"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginHero } from "@/components/login/login-hero";
import { LoginPanel } from "@/components/login/login-panel";
import { API_ORIGIN, logout, ROLE_LABEL } from "@/lib/api";
import { useSession } from "@/lib/use-session";
import "@/styles/login.css";

export function LoginScreen() {
  const router = useRouter();
  const { user, phase, error } = useSession();
  const isStaff = user?.role === "SERVIDOR";

  useEffect(() => {
    if (phase === "ready" && isStaff) router.replace("/admin");
  }, [isStaff, phase, router]);

  return (
    <main className="login-screen">
      <section className="login-screen__form">
        {phase === "loading" || isStaff ? (
          <p className="login-footnote">Carregando sessão…</p>
        ) : user ? (
          <LoginPanel
            title="Acesso restrito"
            description={`Somente servidores administram esta área. A matrícula ${user.suapEnrollment} entrou como ${ROLE_LABEL[user.role]}.`}
            action={
              <button type="button" className="login-button" onClick={() => void logout()}>
                Sair
              </button>
            }
          />
        ) : (
          <LoginPanel
            title="Acesse sua conta"
            description="Registre o ponto e acompanhe a jornada com mais facilidade no Sistema de pontos."
            notice={error}
            footnote="O acesso depende de uma matrícula autorizada por um servidor."
            action={
              <a className="login-button" href={`${API_ORIGIN}/api/auth/suap`}>
                Entrar com SUAP
              </a>
            }
          />
        )}
      </section>
      <aside className="login-screen__hero" aria-hidden="true">
        <LoginHero />
      </aside>
    </main>
  );
}
