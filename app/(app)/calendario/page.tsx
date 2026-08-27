"use client";

import { useEffect, useMemo, useState } from "react";
import { currentMonth, monthLabel, shiftMonth, dateInput, PLAN_LABELS } from "@/lib/format";
import CalendarGrid from "@/components/CalendarGrid";

type Cliente = { id: string; nombrePaciente: string; plan: string | null; estado: string };
type Trabajador = { id: string; nombre: string; estado: string };

type Turno = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  clienteId: string | null;
  trabajadorId: string;
  cliente: { id: string; nombrePaciente: string; plan: string | null } | null;
  trabajador: { id: string; nombre: string };
};

export default function CalendarioPage() {
  const [mes, setMes] = useState(currentMonth());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroCuidador, setFiltroCuidador] = useState("");
  const [filtroPlan, setFiltroPlan] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/clientes").then((r) => r.json()), fetch("/api/trabajadores").then((r) => r.json())]).then(
      ([c, t]) => {
        setClientes(Array.isArray(c) ? c : []);
        setTrabajadores(Array.isArray(t) ? t : []);
      }
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/turnos?mes=${mes}`)
      .then((r) => r.json())
      .then((d) => {
        setTurnos(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, [mes]);

  const visibles = useMemo(
    () =>
      turnos.filter((t) => {
        if (t.estado === "NO_TRABAJADO") return false;
        if (filtroCliente && t.clienteId !== filtroCliente) return false;
        if (filtroCuidador && t.trabajadorId !== filtroCuidador) return false;
        if (filtroPlan && t.cliente?.plan !== filtroPlan) return false;
        return true;
      }),
    [turnos, filtroCliente, filtroCuidador, filtroPlan]
  );

  const clientesOrdenados = [...clientes].sort((a, b) => a.nombrePaciente.localeCompare(b.nombrePaciente));
  const cuidadoresOrdenados = [...trabajadores].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">Calendario de cobertura</h1>
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

      <p className="text-sm text-navy/60">
        Todas las coberturas de cuidadores programadas o trabajadas en el mes. Filtrá por cliente, cuidador o
        plan para ver un recorte específico.
      </p>

      <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Cliente</label>
          <select className="input" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="">Todos</option>
            {clientesOrdenados.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombrePaciente}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Cuidador</label>
          <select className="input" value={filtroCuidador} onChange={(e) => setFiltroCuidador(e.target.value)}>
            <option value="">Todos</option>
            {cuidadoresOrdenados.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Plan</label>
          <select className="input" value={filtroPlan} onChange={(e) => setFiltroPlan(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-navy/60">Cargando…</p>
      ) : (
        <div className="card p-4">
          <p className="text-xs text-navy/50 mb-2">
            {visibles.length} turno{visibles.length === 1 ? "" : "s"} en el mes con estos filtros.
          </p>
          <CalendarGrid
            mes={mes}
            renderDay={(fecha) => {
              const delDia = visibles
                .filter((t) => t.fecha.slice(0, 10) === dateInput(fecha))
                .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
              return (
                <div className="space-y-0.5 max-h-24 overflow-y-auto">
                  {delDia.map((t) => (
                    <div
                      key={t.id}
                      className="truncate rounded px-1 bg-teal/15 text-teal"
                      title={`${t.cliente?.nombrePaciente ?? "(sin cliente)"} · ${t.trabajador.nombre} · ${t.horaInicio}-${t.horaFin}`}
                    >
                      {(t.cliente?.nombrePaciente ?? "—").split(" ")[0]}/{t.trabajador.nombre.split(" ")[0]}
                    </div>
                  ))}
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
