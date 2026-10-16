"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type Intent = "primary" | "outline" | "danger" | "danger-solid" | "danger-soft";

const intentClass: Record<Intent, string> = {
  primary: "rounded-sm",
  outline: "rounded-sm px-2",
  danger: "rounded-sm px-2",
  "danger-solid": "w-full rounded-sm bg-red-500 text-white hover:bg-red-600",
  "danger-soft":
    "rounded-sm border-red-300 bg-red-100 px-2 text-red-500 hover:bg-red-500 hover:text-white",
};

function variantOf(intent: Intent) {
  if (intent === "danger") return "destructive" as const;
  if (intent === "primary") return "default" as const;
  return "outline" as const;
}

export function ActionButton({
  intent = "primary",
  className,
  type = "button",
  ...props
}: ComponentProps<typeof Button> & { intent?: Intent }) {
  return (
    <Button
      type={type}
      variant={variantOf(intent)}
      className={cn("h-9 cursor-pointer", intentClass[intent], className)}
      {...props}
    />
  );
}
