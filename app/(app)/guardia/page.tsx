"use client";

import { useCallback, useEffect, useState } from "react";
import {
  money,
  dateInput,
  currentMonth,
  monthLabel,
  shiftMonth,
  TIPO_LLAMADA_LABELS,
  QUIEN_LLAMA_LABELS,
} from "@/lib/format";

type Nota = {
  id: string;
  fecha: string;
  tipo: string;
  quienLlama: string;
  motivo: string;
  conducta: string | null;
  derivoEmergencia: boolean;
  avisoFamilia: boolean;
  notaCargada: boolean;
  montoLiquidado: string;
  medico: { id: string; nombre: string };
  cliente: { id: string; nombrePaciente: string } | null;
};

type Turno = {
  id: string;
  mes: string;
  bloque: string;
  franjaHoraria: string;
  medicoTitular: { id: string; nombre: string };
  medicoBackup: { id: string; nombre: string } | null;
};

type Opcion = { id: string; nombre: string };

const EMPTY_NOTA = {
  fecha: dateInput(new Date()),
  medicoId: "",
  clienteId: "",
  quienLlama: "CUIDADOR",
  tipo: "GUARDIA",
  motivo: "",
  datosObjetivos: "",
  valoracion: "",
  conducta: "",
  signosAlarma: "",
  derivoEmergencia: false,
  avisoFamilia: false,
  notaCargada: false,
};

export default function GuardiaPage() {
  const [mes, setMes] = useState(currentMonth());
  const [notas, setNotas] = useState<Nota[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [medicos, setMedicos] = useState<Opcion[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombrePaciente: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNota, setShowNota] = useState(false);
  const [form, setForm] = useState(EMPTY_NOTA);
  const [turnoForm, setTurnoForm] = useState({ bloque: "Mes completo", medicoTitularId: "", medicoBackupId: "", franjaHoraria: "24/7" });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/notas-guardia?mes=${mes}`).then((r) => r.json()),
      fetch(`/api/turnos-guardia?mes=${mes}`).then((r) => r.json()),
      fetch("/api/profesionales?rol=MEDICO").then((r) => r.json()),
      fetch("/api/clientes").then((r) => r.json()),
    ]).then(([n, t, m, c]) => {
      setNotas(n);
      setTurnos(t);
      setMedicos(m);
      setClientes(c);
      setLoading(false);
    });
  }, [mes]);

  useEffect(load, [load]);

  async function guardarNota(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/notas-guardia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowNota(false);
    setForm(EMPTY_NOTA);
    load();
  }

  async function toggleCargada(n: Nota) {
    await fetch(`/api/notas-guardia/${n.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notaCargada: !n.notaCargada }),
    });
    load();
  }

  async function borrarNota(id: string) {
    if (!confirm("¿Eliminar esta nota de guardia?")) return;
    await fetch(`/api/notas-guardia/${id}`, { method: "DELETE" });
    load();
  }

  async function guardarTurno(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/turnos-guardia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...turnoForm, mes }),
    });
    setTurnoForm({ bloque: "Mes completo", medicoTitularId: "", medicoBackupId: "", franjaHoraria: "24/7" });
    load();
  }

  const sinCargar = notas.filter((n) => !n.notaCargada).length;
  const sinBackup = turnos.filter((t) => !t.medicoBackup).length;
  const totalLiquidable = notas.reduce((a, n) => a + parseFloat(n.montoLiquidado || "0"), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">Guardia médica</h1>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm" onClick={() => setMes(shiftMonth(mes, -1))}>
            ←
          </button>
          <span className="text-sm font-semibold capitalize min-w-[9rem] text-center">{monthLabel(mes)}</span>
          <button className="btn-ghost text-sm" onClick={() => setMes(shiftMonth(mes, 1))}>
            →
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => {
              // Si se está mirando un mes distinto al actual, la fecha por
              // defecto arranca en ese mes en vez de "hoy" — si no, una nota
              // cargada mientras se navega un mes pasado quedaba fechada hoy
              // y desaparecía de la vista que se estaba mirando.
              setForm({ ...EMPTY_NOTA, fecha: mes === currentMonth() ? dateInput(new Date()) : `${mes}-01` });
              setShowNota(true);
            }}
          >
            + Nota de guardia
          </button>
        </div>
      </div>

      {(sinCargar > 0 || sinBackup > 0) && (
        <div className="card p-4 border-l-4 border-red-500 space-y-1 text-sm">
          {sinCargar > 0 && (
            <p>
              <span className="font-semibold text-red-600">{sinCargar} llamada(s) sin nota cargada.</span> No se liquidan
              hasta que la nota esté en la historia clínica.
            </p>
          )}
          {sinBackup > 0 && (
            <p>
              <span className="font-semibold text-red-600">{sinBackup} bloque(s) de guardia sin médico backup.</span> Sin
              backup no se puede sostener la promesa de respaldo 24/7.
            </p>
          )}
        </div>
      )}

      <section className="card p-5 space-y-3">
        <h2 className="font-display text-lg">Turnos del mes</h2>
        <form onSubmit={guardarTurno} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="label">Bloque</label>
            <input className="input" required value={turnoForm.bloque} onChange={(e) => setTurnoForm({ ...turnoForm, bloque: e.target.value })} />
          </div>
          <div>
            <label className="label">Médico titular</label>
            <select className="input" required value={turnoForm.medicoTitularId} onChange={(e) => setTurnoForm({ ...turnoForm, medicoTitularId: e.target.value })}>
              <option value="">Elegir…</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Backup</label>
            <select className="input" value={turnoForm.medicoBackupId} onChange={(e) => setTurnoForm({ ...turnoForm, medicoBackupId: e.target.value })}>
              <option value="">Sin backup</option>
              {medicos.filter((m) => m.id !== turnoForm.medicoTitularId).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Franja</label>
            <input className="input" value={turnoForm.franjaHoraria} onChange={(e) => setTurnoForm({ ...turnoForm, franjaHoraria: e.target.value })} />
          </div>
          <button className="btn-primary" type="submit">Asignar</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-navy/10 text-navy/60">
                <th className="p-2">Bloque</th>
                <th className="p-2">Titular</th>
                <th className="p-2">Backup</th>
                <th className="p-2">Franja</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr key={t.id} className="border-b border-navy/5">
                  <td className="p-2 font-semibold">{t.bloque}</td>
                  <td className="p-2">{t.medicoTitular.nombre}</td>
                  <td className="p-2">
                    {t.medicoBackup ? t.medicoBackup.nombre : <span className="text-red-600 font-semibold">Sin backup</span>}
                  </td>
                  <td className="p-2">{t.franjaHoraria}</td>
                  <td className="p-2 text-right">
                    <button
                      className="text-red-500 hover:underline"
                      onClick={async () => {
                        await fetch(`/api/turnos-guardia/${t.id}`, { method: "DELETE" });
                        load();
                      }}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
              {turnos.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-navy/50">Nadie asignado a la guardia este mes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showNota && (
        <form onSubmit={guardarNota} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <h2 className="font-display text-lg sm:col-span-2">Nueva nota de guardia</h2>
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div>
            <label className="label">Médico que atiende</label>
            <select className="input" required value={form.medicoId} onChange={(e) => setForm({ ...form, medicoId: e.target.value })}>
              <option value="">Elegir…</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Paciente</label>
            <select className="input" value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Sin paciente asociado</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombrePaciente}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quién llama</label>
            <select className="input" value={form.quienLlama} onChange={(e) => setForm({ ...form, quienLlama: e.target.value })}>
              {Object.entries(QUIEN_LLAMA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo de llamada</label>
            <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {Object.entries(TIPO_LLAMADA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Motivo</label>
            <input className="input" required value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Datos objetivos reportados (PA, FC, T°, SatO2, glicemia…)</label>
            <input className="input" value={form.datosObjetivos} onChange={(e) => setForm({ ...form, datosObjetivos: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Valoración del médico</label>
            <textarea className="input" rows={2} value={form.valoracion} onChange={(e) => setForm({ ...form, valoracion: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Conducta indicada</label>
            <textarea className="input" rows={2} value={form.conducta} onChange={(e) => setForm({ ...form, conducta: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Signos de alarma que debe vigilar el cuidador</label>
            <textarea className="input" rows={2} value={form.signosAlarma} onChange={(e) => setForm({ ...form, signosAlarma: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.derivoEmergencia} onChange={(e) => setForm({ ...form, derivoEmergencia: e.target.checked })} />
            Se derivó a emergencia
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.avisoFamilia} onChange={(e) => setForm({ ...form, avisoFamilia: e.target.checked })} />
            Se avisó a la familia
          </label>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.notaCargada} onChange={(e) => setForm({ ...form, notaCargada: e.target.checked })} />
            Nota cargada en la historia clínica del paciente
          </label>
          <p className="sm:col-span-2 text-xs text-navy/60 -mt-2">
            Sin la nota cargada, la llamada queda registrada pero no se le liquida al médico. Se puede marcar después.
          </p>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit">Guardar</button>
            <button className="btn-ghost" type="button" onClick={() => setShowNota(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <section className="card overflow-x-auto">
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="font-display text-lg">Notas del mes ({notas.length})</h2>
          <span className="text-sm text-navy/60">
            Liquidable: <span className="font-semibold text-navy">{money(totalLiquidable)}</span>
          </span>
        </div>
        {loading ? (
          <p className="p-4 text-navy/60">Cargando…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-navy/10 text-navy/60">
                <th className="p-3">Fecha</th>
                <th className="p-3">Paciente</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Motivo</th>
                <th className="p-3">Médico</th>
                <th className="p-3">Nota en HC</th>
                <th className="p-3 text-right">A pagar</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => (
                <tr key={n.id} className="border-b border-navy/5 hover:bg-navy/[0.02]">
                  <td className="p-3 whitespace-nowrap">{new Date(n.fecha).toLocaleDateString("es-UY")}</td>
                  <td className="p-3">{n.cliente?.nombrePaciente ?? "—"}</td>
                  <td className="p-3">
                    <span className={`badge ${n.tipo === "EMERGENCIA" ? "bg-red-500/15 text-red-600" : "bg-navy/10 text-navy"}`}>
                      {TIPO_LLAMADA_LABELS[n.tipo]}
                    </span>
                  </td>
                  <td className="p-3">
                    {n.motivo}
                    {n.derivoEmergencia && <span className="block text-xs text-red-600">Derivado a emergencia</span>}
                  </td>
                  <td className="p-3">{n.medico.nombre}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleCargada(n)}
                      className={`badge ${n.notaCargada ? "bg-teal/15 text-teal" : "bg-red-500/15 text-red-600"}`}
                    >
                      {n.notaCargada ? "Cargada" : "Pendiente"}
                    </button>
                  </td>
                  <td className="p-3 text-right font-semibold">{money(n.montoLiquidado)}</td>
                  <td className="p-3 text-right">
                    <button className="text-red-500 hover:underline" onClick={() => borrarNota(n.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {notas.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-navy/50">Sin llamadas registradas este mes.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
