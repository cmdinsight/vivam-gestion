"use client";

import { useEffect, useState } from "react";
import { dateInput, TIPO_LLAMADA_LABELS, QUIEN_LLAMA_LABELS } from "@/lib/format";

type Cliente = { id: string; nombrePaciente: string };
type Rol = "MEDICO" | "ENFERMERO";

const EMPTY_NOTA = {
  fecha: dateInput(new Date()),
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
  notaCargada: true,
};

const EMPTY_PROCEDER = { fecha: dateInput(new Date()), clienteId: "", proceder: "", notas: "" };

export default function ReportarPage() {
  const [rol, setRol] = useState<Rol | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formNota, setFormNota] = useState(EMPTY_NOTA);
  const [formProceder, setFormProceder] = useState(EMPTY_PROCEDER);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [cargaError, setCargaError] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/portal/me").then((r) => r.json()), fetch("/api/portal/clientes").then((r) => r.json())])
      .then(([me, c]) => {
        if (!me?.rol) {
          setCargaError(true);
          return;
        }
        setRol(me.rol);
        setClientes(Array.isArray(c) ? c : []);
      })
      .catch(() => setCargaError(true));
  }, []);

  async function guardarNota(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setOk(false);
    const res = await fetch("/api/portal/notas-guardia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formNota),
    });
    setGuardando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo guardar la nota");
      return;
    }
    setFormNota({ ...EMPTY_NOTA, fecha: formNota.fecha });
    setOk(true);
  }

  async function guardarProceder(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setOk(false);
    const res = await fetch("/api/portal/procederes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formProceder),
    });
    setGuardando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo guardar el proceder");
      return;
    }
    setFormProceder({ ...EMPTY_PROCEDER, fecha: formProceder.fecha });
    setOk(true);
  }

  if (cargaError) return <p className="text-red-600">No se pudo cargar esta página. Probá recargar.</p>;
  if (!rol) return <p className="text-navy/60">Cargando…</p>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">{rol === "MEDICO" ? "Cargar nota de guardia" : "Cargar proceder"}</h1>

      {rol === "MEDICO" ? (
        <form onSubmit={guardarNota} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha</label>
            <input
              className="input"
              type="date"
              required
              value={formNota.fecha}
              onChange={(e) => setFormNota({ ...formNota, fecha: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Paciente</label>
            <select
              className="input"
              value={formNota.clienteId}
              onChange={(e) => setFormNota({ ...formNota, clienteId: e.target.value })}
            >
              <option value="">Sin paciente asociado</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombrePaciente}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quién llama</label>
            <select
              className="input"
              value={formNota.quienLlama}
              onChange={(e) => setFormNota({ ...formNota, quienLlama: e.target.value })}
            >
              {Object.entries(QUIEN_LLAMA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo de llamada</label>
            <select
              className="input"
              value={formNota.tipo}
              onChange={(e) => setFormNota({ ...formNota, tipo: e.target.value })}
            >
              {Object.entries(TIPO_LLAMADA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Motivo</label>
            <input
              className="input"
              required
              value={formNota.motivo}
              onChange={(e) => setFormNota({ ...formNota, motivo: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Datos objetivos reportados (PA, FC, T°, SatO2, glicemia…)</label>
            <input
              className="input"
              value={formNota.datosObjetivos}
              onChange={(e) => setFormNota({ ...formNota, datosObjetivos: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Valoración</label>
            <textarea
              className="input"
              rows={2}
              value={formNota.valoracion}
              onChange={(e) => setFormNota({ ...formNota, valoracion: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Conducta indicada</label>
            <textarea
              className="input"
              rows={2}
              value={formNota.conducta}
              onChange={(e) => setFormNota({ ...formNota, conducta: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Signos de alarma que debe vigilar el cuidador</label>
            <textarea
              className="input"
              rows={2}
              value={formNota.signosAlarma}
              onChange={(e) => setFormNota({ ...formNota, signosAlarma: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formNota.derivoEmergencia}
              onChange={(e) => setFormNota({ ...formNota, derivoEmergencia: e.target.checked })}
            />
            Se derivó a emergencia
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formNota.avisoFamilia}
              onChange={(e) => setFormNota({ ...formNota, avisoFamilia: e.target.checked })}
            />
            Se avisó a la familia
          </label>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={formNota.notaCargada}
              onChange={(e) => setFormNota({ ...formNota, notaCargada: e.target.checked })}
            />
            Nota completa (si la dejás sin marcar, esta llamada no se te liquida)
          </label>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          {ok && <p className="sm:col-span-2 text-sm text-teal">Nota guardada.</p>}
          <button className="btn-primary sm:col-span-2" type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar nota"}
          </button>
        </form>
      ) : (
        <form onSubmit={guardarProceder} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha</label>
            <input
              className="input"
              type="date"
              required
              value={formProceder.fecha}
              onChange={(e) => setFormProceder({ ...formProceder, fecha: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Paciente</label>
            <select
              className="input"
              required
              value={formProceder.clienteId}
              onChange={(e) => setFormProceder({ ...formProceder, clienteId: e.target.value })}
            >
              <option value="">Elegir…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombrePaciente}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Proceder</label>
            <input
              className="input"
              required
              placeholder="Curación simple, inyectable, sondaje…"
              value={formProceder.proceder}
              onChange={(e) => setFormProceder({ ...formProceder, proceder: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notas</label>
            <textarea
              className="input"
              rows={2}
              value={formProceder.notas}
              onChange={(e) => setFormProceder({ ...formProceder, notas: e.target.value })}
            />
          </div>
          <p className="sm:col-span-2 text-xs text-navy/60">
            El número del mes, si entra en el cupo del plan y lo que se te paga se calculan solos al guardar.
          </p>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          {ok && <p className="sm:col-span-2 text-sm text-teal">Proceder guardado.</p>}
          <button className="btn-primary sm:col-span-2" type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar proceder"}
          </button>
        </form>
      )}
    </div>
  );
}
