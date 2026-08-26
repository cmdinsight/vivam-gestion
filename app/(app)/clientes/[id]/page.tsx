"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { dateInput, currentMonth, monthLabel, shiftMonth, PLAN_LABELS, ESTADO_CLIENTE_LABELS } from "@/lib/format";
import CalendarGrid from "@/components/CalendarGrid";

const DIAS_CHECKBOX = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
  { label: "Dom", value: 0 },
];

type Cliente = {
  id: string;
  nombrePaciente: string;
  familiaResponsable: string;
  plan: string;
  estado: string;
};

type Trabajador = { id: string; nombre: string; estado: string };

type Asignacion = {
  id: string;
  trabajadorId: string;
  trabajador: { nombre: string };
  diasSemana: number[];
  horaInicio: string;
  horaFin: string;
  fechaInicio: string;
  fechaFin: string | null;
  activa: boolean;
};

type Turno = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  trabajadorId: string;
};

const EMPTY_FORM = {
  trabajadorId: "",
  diasSemana: [] as number[],
  horaInicio: "08:00",
  horaFin: "16:00",
  fechaInicio: dateInput(new Date()),
  fechaFin: "",
  notas: "",
};

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [mes, setMes] = useState(currentMonth());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nombresPorTrabajador, setNombresPorTrabajador] = useState<Record<string, string>>({});

  function loadCliente() {
    fetch(`/api/clientes/${id}`)
      .then((r) => r.json())
      .then(setCliente);
  }

  function loadAsignaciones() {
    fetch(`/api/asignaciones?clienteId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setAsignaciones(d);
        const map: Record<string, string> = {};
        d.forEach((a: Asignacion) => (map[a.trabajadorId] = a.trabajador.nombre));
        setNombresPorTrabajador(map);
      });
  }

  function loadTurnos() {
    fetch(`/api/turnos?clienteId=${id}&mes=${mes}`)
      .then((r) => r.json())
      .then(setTurnos);
  }

  useEffect(() => {
    loadCliente();
    loadAsignaciones();
    fetch("/api/trabajadores")
      .then((r) => r.json())
      .then((d) => setTrabajadores(d.filter((t: Trabajador) => t.estado === "ACTIVO")));
  }, [id]);

  useEffect(loadTurnos, [id, mes]);

  function toggleDia(dia: number) {
    setForm((f) => ({
      ...f,
      diasSemana: f.diasSemana.includes(dia) ? f.diasSemana.filter((d) => d !== dia) : [...f.diasSemana, dia],
    }));
  }

  async function crearAsignacion(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/asignaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clienteId: id, fechaFin: form.fechaFin || null }),
    });
    setShowForm(false);
    setForm(EMPTY_FORM);
    loadAsignaciones();
    loadTurnos();
  }

  async function finalizarAsignacion(asignacionId: string) {
    if (!confirm("¿Finalizar esta asignación? Los turnos ya generados quedan como historial.")) return;
    await fetch(`/api/asignaciones/${asignacionId}`, { method: "DELETE" });
    loadAsignaciones();
  }

  if (!cliente) return <p className="text-navy/60">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">{cliente.nombrePaciente}</h1>
        <p className="text-navy/60 text-sm">
          {cliente.familiaResponsable} · {PLAN_LABELS[cliente.plan]} ·{" "}
          <span className="font-semibold">{ESTADO_CLIENTE_LABELS[cliente.estado]}</span>
        </p>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg">Cuidadores asignados (fijo)</h2>
          <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
            + Nueva asignación
          </button>
        </div>

        {showForm && (
          <form onSubmit={crearAsignacion} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 border-b border-navy/10 pb-4">
            <div>
              <label className="label">Cuidador</label>
              <select
                className="input"
                required
                value={form.trabajadorId}
                onChange={(e) => setForm({ ...form, trabajadorId: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Días de la semana</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS_CHECKBOX.map((d) => (
                  <button
                    type="button"
                    key={d.value}
                    onClick={() => toggleDia(d.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      form.diasSemana.includes(d.value)
                        ? "bg-teal text-white border-teal"
                        : "border-navy/20 text-navy/60"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Hora inicio</label>
              <input
                className="input"
                type="time"
                required
                value={form.horaInicio}
                onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Hora fin</label>
              <input
                className="input"
                type="time"
                required
                value={form.horaFin}
                onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Vigencia desde</label>
              <input
                className="input"
                type="date"
                required
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Vigencia hasta (opcional)</label>
              <input
                className="input"
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary" type="submit" disabled={form.diasSemana.length === 0}>
                Crear y generar turnos
              </button>
              <button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-navy/10 text-navy/60">
              <th className="p-2">Cuidador</th>
              <th className="p-2">Días</th>
              <th className="p-2">Horario</th>
              <th className="p-2">Vigencia</th>
              <th className="p-2">Estado</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.map((a) => (
              <tr key={a.id} className="border-b border-navy/5">
                <td className="p-2 font-semibold">{a.trabajador.nombre}</td>
                <td className="p-2">
                  {a.diasSemana
                    .slice()
                    .sort()
                    .map((d) => DIAS_CHECKBOX.find((x) => x.value === d)?.label)
                    .join(", ")}
                </td>
                <td className="p-2">
                  {a.horaInicio} - {a.horaFin}
                </td>
                <td className="p-2">
                  {new Date(a.fechaInicio).toLocaleDateString("es-UY")}
                  {a.fechaFin ? ` → ${new Date(a.fechaFin).toLocaleDateString("es-UY")}` : ""}
                </td>
                <td className="p-2">
                  <span className={`badge ${a.activa ? "bg-teal/15 text-teal" : "bg-navy/10 text-navy"}`}>
                    {a.activa ? "Activa" : "Finalizada"}
                  </span>
                </td>
                <td className="p-2 text-right">
                  {a.activa && (
                    <button className="text-red-500 hover:underline" onClick={() => finalizarAsignacion(a.id)}>
                      Finalizar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {asignaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-navy/50">
                  Sin asignaciones fijas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg">Cobertura del mes</h2>
          <div className="flex items-center gap-2 text-sm">
            <button className="btn-ghost px-2 py-1" onClick={() => setMes(shiftMonth(mes, -1))}>
              ←
            </button>
            <span className="font-semibold capitalize w-32 text-center">{monthLabel(mes)}</span>
            <button className="btn-ghost px-2 py-1" onClick={() => setMes(shiftMonth(mes, 1))}>
              →
            </button>
          </div>
        </div>
        <CalendarGrid
          mes={mes}
          renderDay={(fecha) => {
            const delDia = turnos.filter((t) => t.fecha.slice(0, 10) === dateInput(fecha));
            return (
              <div className="space-y-0.5">
                {delDia.map((t) => (
                  <div
                    key={t.id}
                    className={`truncate rounded px-1 ${
                      t.estado === "NO_TRABAJADO" ? "bg-red-100 text-red-600 line-through" : "bg-teal/15 text-teal"
                    }`}
                    title={`${nombresPorTrabajador[t.trabajadorId] ?? ""} ${t.horaInicio}-${t.horaFin}`}
                  >
                    {nombresPorTrabajador[t.trabajadorId]?.split(" ")[0]}
                  </div>
                ))}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
