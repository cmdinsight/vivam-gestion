"use client";

import { useCallback, useEffect, useState } from "react";
import { money, dateInput, currentMonth, monthLabel, shiftMonth, ROL_PROFESIONAL_LABELS } from "@/lib/format";

type Proceder = {
  id: string;
  fecha: string;
  proceder: string;
  numeroDelMes: number;
  cupoPlan: number;
  dentroDeCupo: boolean;
  montoCliente: string;
  montoEnfermero: string;
  facturado: boolean;
  enfermero: { id: string; nombre: string };
  cliente: { id: string; nombrePaciente: string; plan: string | null };
};

type Linea = {
  profesionalId: string;
  nombre: string;
  rol: string;
  base: string;
  variable: string;
  cantidadEventos: number;
  subtotal: string;
  tope: string | null;
  total: string;
  topeAplicado: boolean;
  notasSinCargar: number;
  cerrada: { id: string; total: string; pagado: boolean } | null;
};

type Resumen = {
  costoMedicos: string;
  costoEnfermeros: string;
  costoTotal: string;
  facturadoProcederes: string;
  pagadoProcederes: string;
  margenProcederes: string;
};

const EMPTY = { fecha: dateInput(new Date()), clienteId: "", enfermeroId: "", proceder: "", notas: "" };

export default function ProcederesPage() {
  const [mes, setMes] = useState(currentMonth());
  const [procederes, setProcederes] = useState<Proceder[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [enfermeros, setEnfermeros] = useState<{ id: string; nombre: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombrePaciente: string }[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/procederes?mes=${mes}`).then((r) => r.json()),
      fetch(`/api/liquidacion-facturadores?mes=${mes}`).then((r) => r.json()),
      fetch("/api/profesionales?rol=ENFERMERO").then((r) => r.json()),
      fetch("/api/clientes").then((r) => r.json()),
    ]).then(([p, liq, e, c]) => {
      setProcederes(p);
      setLineas(liq.lineas || []);
      setResumen(liq.resumen || null);
      setEnfermeros(e);
      setClientes(c);
      setLoading(false);
    });
  }, [mes]);

  useEffect(load, [load]);

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    const res = await fetch("/api/procederes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "No se pudo registrar el proceder");
      return;
    }
    setShowForm(false);
    setForm(EMPTY);
    load();
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este proceder? Se renumeran los del mes para ese paciente.")) return;
    await fetch(`/api/procederes/${id}`, { method: "DELETE" });
    load();
  }

  async function cerrarMes(profesionalId: string) {
    await fetch("/api/liquidacion-facturadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profesionalId, mes }),
    });
    load();
  }

  async function marcarPagada(liquidacionId: string, pagado: boolean) {
    await fetch("/api/liquidacion-facturadores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liquidacionId, pagado }),
    });
    load();
  }

  const margen = parseFloat(resumen?.margenProcederes ?? "0");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">Procederes y liquidación</h1>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm" onClick={() => setMes(shiftMonth(mes, -1))}>←</button>
          <span className="text-sm font-semibold capitalize min-w-[9rem] text-center">{monthLabel(mes)}</span>
          <button className="btn-ghost text-sm" onClick={() => setMes(shiftMonth(mes, 1))}>→</button>
          <button
            className="btn-primary text-sm"
            onClick={() => {
              // Si se está mirando un mes distinto al actual, la fecha por
              // defecto arranca en ese mes en vez de "hoy" — si no, un proceder
              // cargado mientras se navega un mes pasado quedaba fechado hoy y
              // desaparecía de la vista que se estaba mirando.
              setForm({ ...EMPTY, fecha: mes === currentMonth() ? dateInput(new Date()) : `${mes}-01` });
              setShowForm(true);
            }}
          >
            + Proceder
          </button>
        </div>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-xs text-navy/60">Costo guardia médica</p>
            <p className="font-display text-xl">{money(resumen.costoMedicos)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-navy/60">Costo enfermería</p>
            <p className="font-display text-xl">{money(resumen.costoEnfermeros)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-navy/60">Facturado por procederes</p>
            <p className="font-display text-xl">{money(resumen.facturadoProcederes)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-navy/60">Margen de procederes</p>
            <p className={`font-display text-xl ${margen < 0 ? "text-red-600" : "text-teal"}`}>
              {money(resumen.margenProcederes)}
            </p>
          </div>
        </div>
      )}

      {margen < 0 && (
        <p className="text-xs text-navy/60">
          El margen de procederes en negativo es lo esperable al principio: los procederes incluidos en el cupo de cada
          plan se pagan al enfermero pero no se le cobran al cliente. Es costo de adquisición, no una pérdida.
        </p>
      )}

      {showForm && (
        <form onSubmit={guardar} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <h2 className="font-display text-lg sm:col-span-2">Registrar proceder</h2>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div>
            <label className="label">Paciente</label>
            <select className="input" required value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Elegir…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombrePaciente}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Enfermero</label>
            <select className="input" required value={form.enfermeroId} onChange={(e) => setForm({ ...form, enfermeroId: e.target.value })}>
              <option value="">Elegir…</option>
              {enfermeros.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Proceder</label>
            <input className="input" required placeholder="Curación simple, inyectable, sondaje…" value={form.proceder} onChange={(e) => setForm({ ...form, proceder: e.target.value })} />
          </div>
          <p className="sm:col-span-2 text-xs text-navy/60">
            El número del mes, el cupo del plan, lo que se le cobra al cliente y lo que se le paga al enfermero se
            calculan solos al guardar.
          </p>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit">Guardar</button>
            <button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <section className="card overflow-x-auto">
        <h2 className="font-display text-lg p-4 pb-2">Procederes del mes ({procederes.length})</h2>
        {loading ? (
          <p className="p-4 text-navy/60">Cargando…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-navy/10 text-navy/60">
                <th className="p-3">Fecha</th>
                <th className="p-3">Paciente</th>
                <th className="p-3">Proceder</th>
                <th className="p-3">Enfermero</th>
                <th className="p-3">N° / cupo</th>
                <th className="p-3 text-right">Se cobra</th>
                <th className="p-3 text-right">Se paga</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {procederes.map((p) => (
                <tr key={p.id} className="border-b border-navy/5 hover:bg-navy/[0.02]">
                  <td className="p-3 whitespace-nowrap">{new Date(p.fecha).toLocaleDateString("es-UY")}</td>
                  <td className="p-3">{p.cliente.nombrePaciente}</td>
                  <td className="p-3">{p.proceder}</td>
                  <td className="p-3">{p.enfermero.nombre}</td>
                  <td className="p-3">
                    <span className={`badge ${p.dentroDeCupo ? "bg-teal/15 text-teal" : "bg-champagne/30 text-navy"}`}>
                      {p.numeroDelMes} de {p.cupoPlan} · {p.dentroDeCupo ? "en cupo" : "fuera de cupo"}
                    </span>
                  </td>
                  <td className="p-3 text-right">{money(p.montoCliente)}</td>
                  <td className="p-3 text-right font-semibold">{money(p.montoEnfermero)}</td>
                  <td className="p-3 text-right">
                    <button className="text-red-500 hover:underline" onClick={() => borrar(p.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {procederes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-navy/50">Sin procederes registrados este mes.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="font-display text-lg p-4 pb-2">Liquidación de facturadores · {monthLabel(mes)}</h2>
        <p className="px-4 pb-2 text-xs text-navy/60">
          Contra este total cada profesional emite su factura. Cerrar el mes congela el monto.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-navy/10 text-navy/60">
              <th className="p-3">Profesional</th>
              <th className="p-3">Rol</th>
              <th className="p-3 text-right">Base</th>
              <th className="p-3 text-right">Variable</th>
              <th className="p-3 text-center">Eventos</th>
              <th className="p-3 text-right">A PAGAR</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.profesionalId} className="border-b border-navy/5">
                <td className="p-3 font-semibold">
                  {l.nombre}
                  {l.notasSinCargar > 0 && (
                    <span className="block text-xs font-normal text-red-600">
                      {l.notasSinCargar} nota(s) sin cargar, no se liquidan
                    </span>
                  )}
                  {l.topeAplicado && (
                    <span className="block text-xs font-normal text-navy/70">Tope mensual aplicado</span>
                  )}
                </td>
                <td className="p-3">{ROL_PROFESIONAL_LABELS[l.rol]}</td>
                <td className="p-3 text-right">{money(l.base)}</td>
                <td className="p-3 text-right">{money(l.variable)}</td>
                <td className="p-3 text-center">{l.cantidadEventos}</td>
                <td className="p-3 text-right font-display text-base">{money(l.cerrada ? l.cerrada.total : l.total)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {l.cerrada ? (
                    <button
                      className={`badge ${l.cerrada.pagado ? "bg-teal/15 text-teal" : "bg-navy/10 text-navy"}`}
                      onClick={() => marcarPagada(l.cerrada!.id, !l.cerrada!.pagado)}
                    >
                      {l.cerrada.pagado ? "Pagada" : "Marcar pagada"}
                    </button>
                  ) : (
                    <button className="text-teal hover:underline" onClick={() => cerrarMes(l.profesionalId)}>
                      Cerrar mes
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {lineas.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-navy/50">No hay profesionales activos cargados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
