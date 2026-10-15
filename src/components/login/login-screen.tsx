"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BrandMark } from "@/components/login/brand-mark";
import { LoginHero } from "@/components/login/login-hero";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { API_ORIGIN, logout, ROLE_LABEL } from "@/lib/api";
import { useSession } from "@/lib/use-session";

export function LoginScreen() {
  const router = useRouter();
  const { user, phase, error } = useSession();
  const isStaff = user?.role === "SERVIDOR";

  useEffect(() => {
    if (phase === "ready" && isStaff) router.replace("/admin/matriculas");
  }, [isStaff, phase, router]);

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:flex-row lg:overflow-hidden">
      <section className="flex min-h-dvh flex-1 items-center justify-center px-4 py-6 lg:min-h-0 lg:px-6">
        {phase === "loading" || isStaff ? (
          <p className="text-sm text-muted-foreground">Carregando sessão…</p>
        ) : user ? (
          <LoginPanel
            title="Acesso restrito"
            description={`Somente servidores administram esta área. A matrícula ${user.suapEnrollment} entrou como ${ROLE_LABEL[user.role]}.`}
            action={
              <Button
                type="button"
                className="h-10 w-full rounded-sm"
                onClick={() => void logout()}
              >
                Sair
              </Button>
            }
          />
        ) : (
          <LoginPanel
            title="Bem-vindo(a) a área do administrador"
            description="Gerencie as operações do sistema de forma eficiente e segura."
            notice={error}
            footnote="O acesso depende de uma conta autorizada no sistema."
            action={
              <Button
                className="h-10 w-full rounded-sm"
                nativeButton={false}
                render={<a href={`${API_ORIGIN}/api/auth/suap`} />}
              >
                Entrar com SUAP
              </Button>
            }
          />
        )}
      </section>
      <aside
        className="hidden lg:flex lg:h-dvh lg:w-1/2 lg:p-8"
        aria-hidden="true"
      >
        <LoginHero />
      </aside>
    </main>
  );
}

function LoginPanel({
  title,
  description,
  notice,
  action,
  footnote,
}: {
  title: string;
  description: string;
  notice?: string | null;
  action: ReactNode;
  footnote?: string;
}) {
  return (
    <section className="flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BrandMark />
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {notice ? (
          <Alert variant="destructive">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {action}
        {footnote ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {footnote}
          </p>
        ) : null}
      </div>
    </section>
  );
}
