"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money, currentMonth, monthLabel, shiftMonth } from "@/lib/format";

type Rol = "MEDICO" | "ENFERMERO" | "CUIDADOR";

type Calculo = {
  profesional: { nombre: string; rol: "MEDICO" | "ENFERMERO" };
  base: string;
  variable: string;
  cantidadEventos: number;
  tope: string | null;
  total: string;
  topeAplicado: boolean;
  notasSinCargar: number;
  desglose?: { valoracionesIniciales?: number; montoValoraciones?: string };
};

type Resultado = {
  calculo: Calculo;
  cerrada: { total: string; pagado: boolean } | null;
};

type Cliente = { id: string; nombrePaciente: string };

export default function PortalHomePage() {
  const [rol, setRol] = useState<Rol | null>(null);
  const [nombre, setNombre] = useState("");
  const [mes, setMes] = useState(currentMonth());
  const [data, setData] = useState<Resultado | null>(null);
  const [pacientes, setPacientes] = useState<Cliente[]>([]);
  const [cantidadReportes, setCantidadReportes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me?.rol) {
          setError(true);
          return;
        }
        setRol(me.rol);
        setNombre(me.nombre ?? "");
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!rol) return;
    setLoading(true);
    setError(false);

    if (rol === "CUIDADOR") {
      Promise.all([
        fetch("/api/portal/mis-pacientes").then((r) => r.json()),
        fetch(`/api/portal/reporte-diario?mes=${mes}`).then((r) => r.json()),
      ])
        .then(([p, reportes]) => {
          setPacientes(Array.isArray(p) ? p : []);
          setCantidadReportes(Array.isArray(reportes) ? reportes.length : 0);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
      return;
    }

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
  }, [rol, mes]);

  const esMedico = data?.calculo.profesional.rol === "MEDICO";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">{nombre ? `Hola, ${nombre.split(" ")[0]}` : "Portal"}</h1>
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
        <p className="text-red-600">No se pudo cargar esta página. Probá recargar.</p>
      ) : loading || !rol ? (
        <p className="text-navy/60">Cargando…</p>
      ) : rol === "CUIDADOR" ? (
        <>
          <div className="card p-5">
            <h2 className="font-display text-lg mb-3">Mis pacientes asignados</h2>
            {pacientes.length === 0 ? (
              <p className="text-sm text-navy/50">No tenés pacientes asignados todavía.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {pacientes.map((p) => (
                  <li key={p.id}>{p.nombrePaciente}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-navy/50 mt-3">
              {cantidadReportes} reporte{cantidadReportes === 1 ? "" : "s"} diario{cantidadReportes === 1 ? "" : "s"}{" "}
              cargado{cantidadReportes === 1 ? "" : "s"} este mes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/portal/reportar" className="card p-5 hover:border-teal/40 transition block">
              <p className="font-display text-lg">Cargar reporte diario</p>
              <p className="text-sm text-navy/60 mt-1">Contar cómo estuvo el paciente hoy</p>
            </Link>
            <Link href="/portal/historial" className="card p-5 hover:border-teal/40 transition block">
              <p className="font-display text-lg">Mi historial</p>
              <p className="text-sm text-navy/60 mt-1">Ver todo lo que cargué</p>
            </Link>
          </div>
        </>
      ) : !data ? (
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
                  {!!data.calculo.desglose?.valoracionesIniciales && (
                    <div className="flex justify-between text-xs text-navy/40 pl-3">
                      <span>de las cuales, {data.calculo.desglose.valoracionesIniciales} valoración{data.calculo.desglose.valoracionesIniciales === 1 ? "" : "es"} inicial{data.calculo.desglose.valoracionesIniciales === 1 ? "" : "es"}</span>
                      <span>{money(data.calculo.desglose.montoValoraciones)}</span>
                    </div>
                  )}
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
