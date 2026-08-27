"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money, dateInput, PLAN_LABELS, MODALIDAD_LABELS, FACTURACION_LABELS, ESTADO_CLIENTE_LABELS } from "@/lib/format";

type Cliente = {
  id: string;
  nombrePaciente: string;
  familiaResponsable: string;
  contacto: string | null;
  zona: string | null;
  facturacion: string;
  plan: string | null;
  fechaInicio: string;
  modalidad: string | null;
  precioMensual: string;
  estado: string;
  notas: string | null;
};

type PlanCfg = {
  plan: string;
  horasMes: number;
  precioBase: string;
  costoCuidadorMes: string;
  cupoProcederesMes: number;
  alertaAnual: boolean;
  alertaSemestral: boolean;
};

type ModalidadCfg = { modalidad: string; descuentoPct: string };

type ConfigTarifas = { tarifaHoraClienteDiurna: string; tarifaHoraClienteNocturna: string };

const IVA_PCT = 10;

const EMPTY = {
  nombrePaciente: "",
  familiaResponsable: "",
  contacto: "",
  zona: "",
  facturacion: "PLAN_MENSUAL",
  plan: "ESENCIAL_LUNES_VIERNES",
  fechaInicio: dateInput(new Date()),
  modalidad: "MENSUAL",
  estado: "PROSPECTO",
  notas: "",
};

const ESTADO_COLOR: Record<string, string> = {
  PROSPECTO: "bg-champagne/20 text-champagne",
  ACTIVO: "bg-teal/15 text-teal",
  PAUSADO: "bg-navy/10 text-navy",
  BAJA: "bg-red-100 text-red-600",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [filtro, setFiltro] = useState("");
  const [planes, setPlanes] = useState<PlanCfg[]>([]);
  const [modalidades, setModalidades] = useState<ModalidadCfg[]>([]);
  const [tarifas, setTarifas] = useState<ConfigTarifas | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((d) => {
        setClientes(d);
        setLoading(false);
      });
  }

  useEffect(load, []);
  useEffect(() => {
    fetch("/api/planes")
      .then((r) => r.json())
      .then((d) => {
        setPlanes(d.planes);
        setModalidades(d.modalidades);
      });
    fetch("/api/configuracion")
      .then((r) => r.json())
      .then(setTarifas);
  }, []);

  function startNew() {
    setEditId(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function startEdit(c: Cliente) {
    setEditId(c.id);
    setForm({
      nombrePaciente: c.nombrePaciente,
      familiaResponsable: c.familiaResponsable,
      contacto: c.contacto || "",
      zona: c.zona || "",
      facturacion: c.facturacion,
      plan: c.plan || "ESENCIAL_LUNES_VIERNES",
      fechaInicio: dateInput(c.fechaInicio),
      modalidad: c.modalidad || "MENSUAL",
      estado: c.estado,
      notas: c.notas || "",
    });
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editId ? `/api/clientes/${editId}` : "/api/clientes";
    const method = editId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este cliente y sus cobros asociados?")) return;
    await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    load();
  }

  const filtrados = clientes.filter((c) =>
    `${c.nombrePaciente} ${c.familiaResponsable} ${c.zona ?? ""}`.toLowerCase().includes(filtro.toLowerCase())
  );

  const esPorHora = form.facturacion === "POR_HORA";
  const planCfg = planes.find((p) => p.plan === form.plan);
  const modCfg = modalidades.find((m) => m.modalidad === form.modalidad);
  const precioCalculado =
    planCfg && modCfg ? Math.round(parseFloat(planCfg.precioBase) * (1 - parseFloat(modCfg.descuentoPct) / 100)) : null;
  // debeAlertarMargen() vive en lib/planes.ts junto a código que usa Prisma;
  // se replica la misma condición acá en vez de importarlo para no arrastrar
  // el cliente de Prisma al bundle del navegador.
  const mostrarAlerta =
    !esPorHora &&
    ((!!planCfg?.alertaAnual && form.modalidad === "ANUAL") ||
      (!!planCfg?.alertaSemestral && form.modalidad === "SEMESTRAL"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">Clientes</h1>
        <div className="flex gap-2">
          <a href="/api/export/clientes" className="btn-ghost text-sm">
            Exportar CSV
          </a>
          <button className="btn-primary text-sm" onClick={startNew}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Buscar por paciente, familia o zona…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />

      {showForm && (
        <form onSubmit={onSubmit} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Paciente</label>
            <input
              className="input"
              required
              value={form.nombrePaciente}
              onChange={(e) => setForm({ ...form, nombrePaciente: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Familia responsable</label>
            <input
              className="input"
              required
              value={form.familiaResponsable}
              onChange={(e) => setForm({ ...form, familiaResponsable: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Contacto</label>
            <input
              className="input"
              value={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Zona</label>
            <input className="input" value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Modo de facturación</label>
            <div className="flex gap-2">
              {(["PLAN_MENSUAL", "POR_HORA"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setForm({ ...form, facturacion: f })}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                    form.facturacion === f ? "bg-teal text-white border-teal" : "border-navy/20 text-navy/60"
                  }`}
                >
                  {FACTURACION_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {esPorHora ? (
            <div className="sm:col-span-2 rounded-lg border border-navy/10 bg-navy/[0.03] p-3 text-sm space-y-1">
              <p className="font-semibold text-navy">
                Tarifa por hora sin plan (uso típico: cobertura puntual, post-operatorios cortos)
              </p>
              {tarifas && (
                <p className="text-navy/70">
                  Diurna 06:00-20:00: {money(parseFloat(tarifas.tarifaHoraClienteDiurna) * (1 + IVA_PCT / 100))} c/IVA
                  ({money(tarifas.tarifaHoraClienteDiurna)} + {IVA_PCT}% IVA) · Nocturna 20:00-06:00:{" "}
                  {money(parseFloat(tarifas.tarifaHoraClienteNocturna) * (1 + IVA_PCT / 100))} c/IVA (
                  {money(tarifas.tarifaHoraClienteNocturna)} + {IVA_PCT}% IVA)
                </p>
              )}
              <p className="text-navy/50 text-xs">
                El monto mensual se calcula solo a partir de las horas reales trabajadas (turnos). Mínimo recomendado
                por visita: 4 horas — por debajo no se cubre el costo logístico del cuidador.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="label">Plan contratado</label>
                <select className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                  {Object.entries(PLAN_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                {planCfg && (
                  <p className="text-xs text-navy/50 mt-1">
                    {planCfg.horasMes} h/mes · {planCfg.cupoProcederesMes} procederes/mes
                  </p>
                )}
              </div>
              <div>
                <label className="label">Modalidad de compromiso</label>
                <select
                  className="input"
                  value={form.modalidad}
                  onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
                >
                  {Object.entries(MODALIDAD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {planCfg && (
                <div className="sm:col-span-2 rounded-lg border border-navy/10 bg-navy/[0.02] p-3">
                  <p className="text-xs font-semibold text-navy/60 mb-2">
                    Precio de {PLAN_LABELS[planCfg.plan]} según modalidad (para comparar antes de elegir)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {modalidades.map((m) => {
                      const precioMod = Math.round(parseFloat(planCfg.precioBase) * (1 - parseFloat(m.descuentoPct) / 100));
                      const alerta =
                        (planCfg.alertaAnual && m.modalidad === "ANUAL") ||
                        (planCfg.alertaSemestral && m.modalidad === "SEMESTRAL");
                      const elegida = m.modalidad === form.modalidad;
                      return (
                        <button
                          type="button"
                          key={m.modalidad}
                          onClick={() => setForm({ ...form, modalidad: m.modalidad })}
                          className={`rounded-lg border p-2 text-left transition ${
                            elegida ? "border-teal bg-teal/10" : "border-navy/10 bg-white hover:border-navy/30"
                          }`}
                        >
                          <p className="text-xs text-navy/60">
                            {MODALIDAD_LABELS[m.modalidad]} · {m.descuentoPct}% off
                          </p>
                          <p className="font-semibold text-navy">
                            {money(precioMod)} {alerta && <span title="Margen bajo, no ofrecer proactivamente">⚠️</span>}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          <div>
            <label className="label">Fecha de inicio</label>
            <input
              className="input"
              type="date"
              required
              value={form.fechaInicio}
              onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
            />
          </div>
          {!esPorHora && (
            <div>
              <label className="label">Precio mensual (calculado automáticamente)</label>
              <div className="input bg-navy/5 font-semibold text-navy">
                {precioCalculado !== null ? money(precioCalculado) : "—"}
              </div>
            </div>
          )}
          {mostrarAlerta && (
            <div className="sm:col-span-2 rounded-lg border-l-4 border-red-400 bg-red-50 p-3 text-sm text-red-700">
              ⚠️ Este plan en modalidad {MODALIDAD_LABELS[form.modalidad]} cae a un margen bajo (zona ámbar/rojo una
              vez descontados cuidador, enfermería y guardia médica). No se debe ofrecer proactivamente — solo
              cerrarlo así si el cliente lo negocia explícitamente. La venta no está bloqueada.
            </div>
          )}
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              {Object.entries(ESTADO_CLIENTE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notas</label>
            <textarea
              className="input"
              rows={2}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit">
              Guardar
            </button>
            <button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-navy/60">Cargando…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-navy/10 text-navy/60">
                <th className="p-3">Paciente</th>
                <th className="p-3">Familia</th>
                <th className="p-3">Zona</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Precio mensual</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-navy/5 hover:bg-navy/[0.02]">
                  <td className="p-3 font-semibold">
                    <Link href={`/clientes/${c.id}`} className="hover:text-teal">
                      {c.nombrePaciente}
                    </Link>
                  </td>
                  <td className="p-3">{c.familiaResponsable}</td>
                  <td className="p-3">{c.zona}</td>
                  <td className="p-3">{c.plan ? PLAN_LABELS[c.plan] : "Por hora (sin plan)"}</td>
                  <td className="p-3">{c.facturacion === "POR_HORA" ? "Según turnos" : money(c.precioMensual)}</td>
                  <td className="p-3">
                    <span className={`badge ${ESTADO_COLOR[c.estado]}`}>{ESTADO_CLIENTE_LABELS[c.estado]}</span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link href={`/clientes/${c.id}`} className="text-teal hover:underline mr-3">
                      Cobertura
                    </Link>
                    <button className="text-teal hover:underline mr-3" onClick={() => startEdit(c)}>
                      Editar
                    </button>
                    <button className="text-red-500 hover:underline" onClick={() => onDelete(c.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-navy/50">
                    No hay clientes que coincidan.
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
