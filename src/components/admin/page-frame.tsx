import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";

export function AdminPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-40 flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  if (tone === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{children}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-primary/20 bg-secondary text-secondary-foreground">
      <AlertDescription className="text-secondary-foreground">{children}</AlertDescription>
    </Alert>
  );
}

export function StatusBadge({ active, on = "Ativo", off = "Inativo" }: { active: boolean; on?: string; off?: string }) {
  return <Badge variant={active ? "default" : "outline"}>{active ? on : off}</Badge>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell className="h-24 text-center text-muted-foreground" colSpan={colSpan}>
        {children}
      </TableCell>
    </TableRow>
  );
}
