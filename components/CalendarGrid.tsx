"use client";

import type { ReactNode } from "react";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function diasDelMes(mes: string): Date[] {
  const [y, m] = mes.split("-").map(Number);
  const primero = new Date(y, m - 1, 1);
  const ultimo = new Date(y, m, 0);
  const dias: Date[] = [];

  // relleno inicial para que la semana empiece en lunes
  const offset = (primero.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) dias.push(null as unknown as Date);

  for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(y, m - 1, d));
  return dias;
}

export default function CalendarGrid({
  mes,
  renderDay,
}: {
  mes: string;
  renderDay: (fecha: Date) => ReactNode;
}) {
  const dias = diasDelMes(mes);

  return (
    <div className="grid grid-cols-7 gap-1.5 text-xs">
      {DIAS.map((d) => (
        <div key={d} className="text-center font-semibold text-navy/50 pb-1">
          {d}
        </div>
      ))}
      {dias.map((fecha, i) =>
        fecha ? (
          <div key={i} className="min-h-[4.5rem] rounded-lg border border-navy/10 bg-white p-1.5">
            <div className="text-navy/40 font-semibold mb-0.5">{fecha.getDate()}</div>
            {renderDay(fecha)}
          </div>
        ) : (
          <div key={i} />
        )
      )}
    </div>
  );
}
