"use client";

import { Field } from "@/components/admin/page-frame";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

export function TextField({
  label,
  id,
  value,
  onValueChange,
  type = "text",
  placeholder,
  className,
  required,
}: {
  label: string;
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  type?: "text" | "time" | "date" | "number";
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        className={cn("rounded-sm h-9", className)}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    </Field>
  );
}
