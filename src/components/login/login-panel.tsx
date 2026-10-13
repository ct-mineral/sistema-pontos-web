import type { ReactNode } from "react";
import { BrandMark } from "@/components/login/brand-mark";

export function LoginPanel({
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
    <section className="login-panel">
      <div className="login-panel__intro">
        <BrandMark />
        <div>
          <h1 className="login-panel__title">{title}</h1>
          <p className="login-panel__subtitle">{description}</p>
        </div>
      </div>
      <div className="login-panel__fields">
        {notice ? <p className="login-notice">{notice}</p> : null}
        {action}
        {footnote ? <p className="login-footnote">{footnote}</p> : null}
      </div>
    </section>
  );
}
