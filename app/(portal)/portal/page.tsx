"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money, currentMonth, monthLabel, shiftMonth } from "@/lib/format";

type Calculo = {
  profesional: { nombre: string; rol: "MEDICO" | "ENFERMERO" };
  base: string;
  variable: string;
  cantidadEventos: number;
  tope: string | null;
  total: string;
  topeAplicado: boolean;
  notasSinCargar: number;
};

type Resultado = {
  calculo: Calculo;
  cerrada: { total: string; pagado: boolean } | null;
};

export default function PortalHomePage() {
  const [mes, setMes] = useState(currentMonth());
  const [data, setData] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/portal/liquidacion?mes=${mes}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d?.calculo) {
          setError(true);
          setLoading(false);
          return;
        }
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [mes]);

  const esMedico = data?.calculo.profesional.rol === "MEDICO";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">{data ? `Hola, ${data.calculo.profesional.nombre.split(" ")[0]}` : "Portal"}</h1>
        <div className="flex items-center gap-2 text-sm">
          <button className="btn-ghost px-2 py-1" onClick={() => setMes(shiftMonth(mes, -1))}>
            ←
          </button>
          <span className="font-semibold capitalize w-36 text-center">{monthLabel(mes)}</span>
          <button className="btn-ghost px-2 py-1" onClick={() => setMes(shiftMonth(mes, 1))}>
            →
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-red-600">No se pudo cargar tu liquidación. Probá recargar la página.</p>
      ) : loading || !data ? (
        <p className="text-navy/60">Cargando…</p>
      ) : (
        <>
          {esMedico && data.calculo.notasSinCargar > 0 && (
            <div className="card p-4 border-l-4 border-champagne bg-champagne/10 text-sm">
              Tenés {data.calculo.notasSinCargar} nota{data.calculo.notasSinCargar === 1 ? "" : "s"} de guardia sin
              cargar este mes: esas llamadas no se te liquidan hasta que las completes.
            </div>
          )}

          <div className="card p-5">
            <h2 className="font-display text-lg mb-3">Mi liquidación del mes</h2>
            <div className="space-y-2 text-sm">
              {esMedico ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-navy/60">Base por disponibilidad</span>
                    <span className="font-semibold">{money(data.calculo.base)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy/60">Variable por llamadas ({data.calculo.cantidadEventos})</span>
                    <span className="font-semibold">{money(data.calculo.variable)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-navy/60">Procederes realizados ({data.calculo.cantidadEventos})</span>
                  <span className="font-semibold">{money(data.calculo.variable)}</span>
                </div>
              )}
              {data.calculo.topeAplicado && (
                <p className="text-xs text-champagne">Se aplicó el tope mensual ({money(data.calculo.tope)}).</p>
              )}
              <div className="flex justify-between border-t border-navy/10 pt-2">
                <span className="font-semibold">Total del mes</span>
                <span className="font-display text-xl text-teal">{money(data.calculo.total)}</span>
              </div>
            </div>
            <div className="mt-3">
              {data.cerrada ? (
                <span className={`badge ${data.cerrada.pagado ? "bg-teal/15 text-teal" : "bg-champagne/20 text-champagne"}`}>
                  {data.cerrada.pagado ? "Pagado" : "Cerrado, pendiente de pago"}
                </span>
              ) : (
                <span className="badge bg-navy/10 text-navy">Mes en curso, todavía no cerrado</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/portal/reportar" className="card p-5 hover:border-teal/40 transition block">
              <p className="font-display text-lg">{esMedico ? "Cargar nota de guardia" : "Cargar proceder"}</p>
              <p className="text-sm text-navy/60 mt-1">Registrar una atención de hoy</p>
            </Link>
            <Link href="/portal/historial" className="card p-5 hover:border-teal/40 transition block">
              <p className="font-display text-lg">Mi historial</p>
              <p className="text-sm text-navy/60 mt-1">Ver todo lo que cargué</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
