"use client";

import { useEffect, useState } from "react";
import { money, currentMonth, monthLabel, shiftMonth, ESTADO_COBRO_LABELS } from "@/lib/format";

type Cobro = {
  id: string;
  mes: string;
  montoEsperado: string;
  fechaVencimiento: string;
  estado: string;
  montoCobrado: string | null;
  fechaCobro: string | null;
  cliente: { nombrePaciente: string; familiaResponsable: string };
};

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "bg-navy/10 text-navy",
  COBRADO: "bg-teal/15 text-teal",
  ATRASADO: "bg-red-100 text-red-600",
};

export default function CobrosPage() {
  const [mes, setMes] = useState(currentMonth());
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(true);

  function load(targetMes: string) {
    setLoading(true);
    fetch(`/api/cobros?mes=${targetMes}`)
      .then((r) => r.json())
      .then((d) => {
        setCobros(d);
        setLoading(false);
      });
  }

  useEffect(() => load(mes), [mes]);

  async function generar() {
    setLoading(true);
    const res = await fetch("/api/cobros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes }),
    });
    setCobros(await res.json());
    setLoading(false);
  }

  async function marcar(c: Cobro, estado: string) {
    const body: Record<string, unknown> = { estado };
    if (estado === "COBRADO") {
      body.montoCobrado = c.montoEsperado;
      body.fechaCobro = new Date().toISOString();
    }
    const res = await fetch(`/api/cobros/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const actualizado = await res.json();
    setCobros((prev) => prev.map((x) => (x.id === c.id ? actualizado : x)));
  }

  const totalEsperado = cobros.reduce((a, c) => a + parseFloat(c.montoEsperado), 0);
  const totalCobrado = cobros.reduce((a, c) => a + (c.estado === "COBRADO" ? parseFloat(c.montoCobrado ?? c.montoEsperado) : 0), 0);
  const pctAtraso = totalEsperado > 0 ? ((totalEsperado - totalCobrado) / totalEsperado) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">Cobros a clientes</h1>
        <div className="flex items-center gap-2">
          <a href={`/api/export/cobros?mes=${mes}`} className="btn-ghost text-sm">
            Exportar CSV
          </a>
          <button className="btn-accent text-sm" onClick={generar}>
            Generar cobros del mes
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button className="btn-ghost px-2 py-1" onClick={() => setMes(shiftMonth(mes, -1))}>
          ←
        </button>
        <span className="font-semibold capitalize w-36 text-center">{monthLabel(mes)}</span>
        <button className="btn-ghost px-2 py-1" onClick={() => setMes(shiftMonth(mes, 1))}>
          →
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="label">Total facturado</p>
          <p className="font-display text-xl">{money(totalEsperado)}</p>
        </div>
        <div className="card p-4">
          <p className="label">Total cobrado</p>
          <p className="font-display text-xl text-teal">{money(totalCobrado)}</p>
        </div>
        <div className="card p-4">
          <p className="label">% de atraso</p>
          <p className="font-display text-xl text-red-600">{pctAtraso.toFixed(1)}%</p>
        </div>
      </div>

      {loading ? (
        <p className="text-navy/60">Cargando…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-navy/10 text-navy/60">
                <th className="p-3">Paciente</th>
                <th className="p-3">Familia</th>
                <th className="p-3">Monto esperado</th>
                <th className="p-3">Vencimiento</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {cobros.map((c) => (
                <tr key={c.id} className="border-b border-navy/5">
                  <td className="p-3 font-semibold">{c.cliente.nombrePaciente}</td>
                  <td className="p-3">{c.cliente.familiaResponsable}</td>
                  <td className="p-3">{money(c.montoEsperado)}</td>
                  <td className="p-3">{new Date(c.fechaVencimiento).toLocaleDateString("es-UY")}</td>
                  <td className="p-3">
                    <span className={`badge ${ESTADO_COLOR[c.estado]}`}>{ESTADO_COBRO_LABELS[c.estado]}</span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {c.estado !== "COBRADO" ? (
                      <button className="text-teal hover:underline mr-3" onClick={() => marcar(c, "COBRADO")}>
                        Marcar cobrado
                      </button>
                    ) : (
                      <button className="text-navy/60 hover:underline mr-3" onClick={() => marcar(c, "PENDIENTE")}>
                        Deshacer
                      </button>
                    )}
                    {c.estado === "PENDIENTE" && (
                      <button className="text-red-500 hover:underline" onClick={() => marcar(c, "ATRASADO")}>
                        Marcar atrasado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {cobros.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-navy/50">
                    No hay cobros cargados para este mes. Usá &quot;Generar cobros del mes&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
