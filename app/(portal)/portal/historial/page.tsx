"use client";

import { useEffect, useState } from "react";
import { money, currentMonth, monthLabel, shiftMonth, TIPO_LLAMADA_LABELS } from "@/lib/format";

type Rol = "MEDICO" | "ENFERMERO";

type Nota = {
  id: string;
  fecha: string;
  tipo: string;
  motivo: string;
  derivoEmergencia: boolean;
  notaCargada: boolean;
  montoLiquidado: string;
  cliente: { nombrePaciente: string } | null;
};

type Proceder = {
  id: string;
  fecha: string;
  proceder: string;
  dentroDeCupo: boolean;
  montoEnfermero: string;
  cliente: { nombrePaciente: string };
};

export default function HistorialPage() {
  const [rol, setRol] = useState<Rol | null>(null);
  const [mes, setMes] = useState(currentMonth());
  const [notas, setNotas] = useState<Nota[]>([]);
  const [procederes, setProcederes] = useState<Proceder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargaError, setCargaError] = useState(false);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me?.rol) {
          setCargaError(true);
          return;
        }
        setRol(me.rol);
      })
      .catch(() => setCargaError(true));
  }, []);

  useEffect(() => {
    if (!rol) return;
    setLoading(true);
    const endpoint = rol === "MEDICO" ? `/api/portal/notas-guardia?mes=${mes}` : `/api/portal/procederes?mes=${mes}`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => {
        if (rol === "MEDICO") setNotas(Array.isArray(d) ? d : []);
        else setProcederes(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, [rol, mes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">Mi historial</h1>
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

      {cargaError ? (
        <p className="text-red-600">No se pudo cargar tu historial. Probá recargar la página.</p>
      ) : loading || !rol ? (
        <p className="text-navy/60">Cargando…</p>
      ) : rol === "MEDICO" ? (
        <div className="card divide-y divide-navy/5">
          {notas.length === 0 && <p className="p-6 text-center text-navy/50">Sin notas cargadas este mes.</p>}
          {notas.map((n) => (
            <div key={n.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {new Date(n.fecha).toLocaleDateString("es-UY", { timeZone: "UTC" })} · {TIPO_LLAMADA_LABELS[n.tipo]}
                </span>
                <span className="font-semibold text-teal">{money(n.montoLiquidado)}</span>
              </div>
              <p className="text-navy/60 mt-0.5">{n.cliente?.nombrePaciente ?? "Sin paciente asociado"}</p>
              <p className="mt-1">{n.motivo}</p>
              <div className="flex gap-2 mt-1">
                {n.derivoEmergencia && <span className="badge bg-red-100 text-red-600">Derivado a emergencia</span>}
                {!n.notaCargada && <span className="badge bg-champagne/20 text-champagne">Sin cargar — no liquida</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-navy/5">
          {procederes.length === 0 && <p className="p-6 text-center text-navy/50">Sin procederes cargados este mes.</p>}
          {procederes.map((p) => (
            <div key={p.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {new Date(p.fecha).toLocaleDateString("es-UY", { timeZone: "UTC" })} · {p.proceder}
                </span>
                <span className="font-semibold text-teal">{money(p.montoEnfermero)}</span>
              </div>
              <p className="text-navy/60 mt-0.5">{p.cliente.nombrePaciente}</p>
              {!p.dentroDeCupo && <span className="badge bg-navy/10 text-navy mt-1 inline-block">Fuera de cupo</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
