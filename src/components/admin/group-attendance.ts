"use client";

import { useEffect, useState } from "react";
import {
  fetchPeriodByEnrollment,
  type DayInterval,
  type Group,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatTime } from "@/lib/schedule";

export type AttendanceState =
  | { status: "ready"; intervals: DayInterval[] }
  | { status: "error"; message: string };

type Loaded = { key: string; byEnrollment: Record<string, AttendanceState> };

const CONCURRENCY = 4;

export function useGroupAttendance(
  group: Pick<Group, "id" | "people"> | null,
  date: string,
) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const groupId = group?.id ?? "";
  const enrollments =
    group?.people.map((p) => p.suapEnrollment).join(",") ?? "";
  const key = `${groupId}|${date}|${enrollments}|${reloadKey}`;

  useEffect(() => {
    if (!groupId || !date) return;
    let active = true;
    const list = enrollments ? enrollments.split(",") : [];
    const byEnrollment: Record<string, AttendanceState> = {};
    let next = 0;

    async function worker() {
      while (next < list.length) {
        const enrollment = list[next++];
        try {
          const period = await fetchPeriodByEnrollment(enrollment, date, date);
          const day =
            period.days.find((item) => item.date.slice(0, 10) === date) ??
            period.days[0];
          byEnrollment[enrollment] = {
            status: "ready",
            intervals: (day?.intervals ?? []).filter(
              (interval) => interval.groupId === groupId,
            ),
          };
        } catch (caught) {
          byEnrollment[enrollment] = {
            status: "error",
            message:
              caught instanceof ApiError
                ? caught.message
                : "Não foi possível consultar.",
          };
        }
      }
    }

    void Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker),
    ).then(() => {
      if (active) setLoaded({ key, byEnrollment });
    });

    return () => {
      active = false;
    };
  }, [groupId, date, enrollments, reloadKey, key]);

  const ready = loaded?.key === key;
  return {
    loading: Boolean(groupId && date) && !ready,
    byEnrollment: ready ? loaded.byEnrollment : {},
    reload: () => setReloadKey((value) => value + 1),
  };
}

export type AttendanceView = {
  lines: string[];
  label: "Presente" | "Saiu" | "Sem registro" | "Erro";
  variant: "default" | "secondary" | "outline" | "destructive";
};

export function describeAttendance(
  state: AttendanceState | undefined,
): AttendanceView | null {
  if (!state) return null;
  if (state.status === "error") {
    return { lines: [state.message], label: "Erro", variant: "destructive" };
  }

  const intervals = state.intervals.filter((item) => item.entryAt);
  if (intervals.length === 0) {
    return { lines: [], label: "Sem registro", variant: "outline" };
  }

  const lines = intervals.map((item) => {
    const entry = formatTime(item.entryAt as string);
    if (!item.exitAt) return `${entry} → em aberto`;
    const exit = formatTime(item.exitAt);
    return `${entry} → ${exit}${item.refused ? " (saída recusada)" : ""}`;
  });

  // Saída recusada volta para o leitor, então a pessoa continua presente.
  const last = intervals[intervals.length - 1];
  const present = !last.exitAt || last.refused;
  return {
    lines,
    label: present ? "Presente" : "Saiu",
    variant: present ? "default" : "secondary",
  };
}

export function punchedCount(
  people: { suapEnrollment: string }[],
  byEnrollment: Record<string, AttendanceState>,
) {
  return people.filter((person) => {
    const view = describeAttendance(byEnrollment[person.suapEnrollment]);
    return view != null && view.lines.length > 0;
  }).length;
}
