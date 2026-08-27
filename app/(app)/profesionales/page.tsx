"use client";

import { useEffect, useState } from "react";
import { money, dateInput, ROL_PROFESIONAL_LABELS, seguroVencido } from "@/lib/format";

type Profesional = {
  id: string;
  nombre: string;
  rol: string;
  especialidad: string | null;
  contacto: string | null;
  cajaProfesional: string | null;
  rutMonotributo: string | null;
  seguroRcVence: string | null;
  baseMensual: string | null;
  topeMensual: string | null;
  pctProceder: string | null;
  zonas: string | null;
  estado: string;
  usuario: string | null;
};

type Config = {
  baseMensualMedico: string;
  tarifaProgramada: string;
  tarifaGuardia: string;
  tarifaEmergencia: string;
  topeMensualMedico: string;
  precioValoracionInicial: string;
  pctEnfermero: string;
  precioProcederSinIva: string;
};

const CAMPOS_CONFIG: { key: keyof Config; label: string }[] = [
  { key: "baseMensualMedico", label: "Base mensual del médico" },
  { key: "tarifaProgramada", label: "Consulta programada" },
  { key: "tarifaGuardia", label: "Consulta de guardia" },
  { key: "tarifaEmergencia", label: "Emergencia" },
  { key: "topeMensualMedico", label: "Tope mensual del médico" },
  { key: "precioValoracionInicial", label: "Valoración inicial a domicilio (gratis al cliente)" },
  { key: "pctEnfermero", label: "% del proceder al enfermero" },
  { key: "precioProcederSinIva", label: "Precio del proceder (sin IVA)" },
];

const EMPTY = {
  nombre: "",
  rol: "MEDICO",
  especialidad: "",
  contacto: "",
  cajaProfesional: "",
  rutMonotributo: "",
  seguroRcVence: "",
  cuentaBancaria: "",
  baseMensual: "",
  topeMensual: "",
  pctProceder: "",
  zonas: "",
  estado: "ACTIVO",
  notas: "",
};

export default function ProfesionalesPage() {
  const [items, setItems] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [filtro, setFiltro] = useState<"TODOS" | "MEDICO" | "ENFERMERO">("TODOS");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [cfgAbierta, setCfgAbierta] = useState(false);
  const [cfgGuardada, setCfgGuardada] = useState(false);
  const [accesoId, setAccesoId] = useState<string | null>(null);
  const [accesoForm, setAccesoForm] = useState({ usuario: "", password: "" });
  const [accesoError, setAccesoError] = useState("");
  const [accesoGuardando, setAccesoGuardando] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/profesionales").then((r) => r.json()),
      fetch("/api/configuracion-facturadores").then((r) => r.json()),
    ]).then(([d, c]) => {
      setItems(d);
      setCfg(c);
      setLoading(false);
    });
  }

  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    await fetch("/api/configuracion-facturadores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        Object.fromEntries(CAMPOS_CONFIG.map((c) => [c.key, parseFloat(String(cfg[c.key]) || "0")]))
      ),
    });
    setCfgGuardada(true);
    setTimeout(() => setCfgGuardada(false), 2500);
  }

  useEffect(load, []);

  function abrirNuevo(rol: string) {
    setEditId(null);
    setForm({ ...EMPTY, rol });
    setShowForm(true);
  }

  function abrirEdicion(p: Profesional) {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      rol: p.rol,
      especialidad: p.especialidad ?? "",
      contacto: p.contacto ?? "",
      cajaProfesional: p.cajaProfesional ?? "",
      rutMonotributo: p.rutMonotributo ?? "",
      seguroRcVence: p.seguroRcVence ? dateInput(p.seguroRcVence) : "",
      cuentaBancaria: "",
      baseMensual: p.baseMensual ?? "",
      topeMensual: p.topeMensual ?? "",
      pctProceder: p.pctProceder ?? "",
      zonas: p.zonas ?? "",
      estado: p.estado,
      notas: "",
    });
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editId ? `/api/profesionales/${editId}` : "/api/profesionales";
    await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY);
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este profesional y todo su historial de notas, procederes y liquidaciones?")) return;
    await fetch(`/api/profesionales/${id}`, { method: "DELETE" });
    load();
  }

  function abrirAcceso(p: Profesional) {
    setAccesoId(p.id);
    setAccesoForm({ usuario: p.usuario ?? "", password: "" });
    setAccesoError("");
  }

  async function guardarAcceso(e: React.FormEvent) {
    e.preventDefault();
    if (!accesoId) return;
    setAccesoGuardando(true);
    setAccesoError("");
    const res = await fetch(`/api/profesionales/${accesoId}/credenciales`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accesoForm),
    });
    setAccesoGuardando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAccesoError(d.error || "No se pudo guardar el acceso");
      return;
    }
    setAccesoId(null);
    load();
  }

  async function quitarAcceso(id: string) {
    if (!confirm("¿Quitar el acceso al portal? El profesional no va a poder loguearse más hasta que se lo configures de nuevo.")) return;
    await fetch(`/api/profesionales/${id}/credenciales`, { method: "DELETE" });
    load();
  }

  const visibles = items.filter((p) => filtro === "TODOS" || p.rol === filtro);
  const esMedico = form.rol === "MEDICO";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">Profesionales facturadores</h1>
        <div className="flex gap-2">
          <button className="btn-ghost text-sm" onClick={() => abrirNuevo("ENFERMERO")}>
            + Enfermero
          </button>
          <button className="btn-primary text-sm" onClick={() => abrirNuevo("MEDICO")}>
            + Médico
          </button>
        </div>
      </div>

      <p className="text-sm text-navy/60">
        Médicos y enfermeros que facturan a Vivam. No son trabajadores dependientes: no generan BPS,
        aguinaldo ni licencia. Los cuidadores dependientes se cargan en{" "}
        <span className="font-semibold">Cuidadores</span>.
      </p>

      <section className="card p-5">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setCfgAbierta(!cfgAbierta)}
          type="button"
        >
          <span className="font-display text-lg">Parámetros de pago</span>
          <span className="text-sm text-teal">{cfgAbierta ? "Ocultar" : "Ver / editar"}</span>
        </button>
        {cfgAbierta && cfg && (
          <form onSubmit={guardarConfig} className="mt-4 space-y-4">
            <p className="text-sm text-navy/60">
              Valores por defecto del módulo. Cada profesional puede tener los suyos propios; si los deja vacíos, se
              usan estos. Tienen que coincidir con la hoja <span className="font-semibold">Variables</span> de la Matriz
              Maestra.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CAMPOS_CONFIG.map((c) => (
                <div key={c.key}>
                  <label className="label">{c.label}</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={cfg[c.key] ?? ""}
                    onChange={(e) => setCfg({ ...cfg, [c.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary" type="submit">Guardar parámetros</button>
              {cfgGuardada && <span className="text-sm text-teal">Guardado.</span>}
            </div>
          </form>
        )}
      </section>

      <div className="flex gap-1">
        {(["TODOS", "MEDICO", "ENFERMERO"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
              filtro === f ? "bg-teal text-white" : "bg-navy/5 text-navy/70 hover:bg-navy/10"
            }`}
          >
            {f === "TODOS" ? "Todos" : ROL_PROFESIONAL_LABELS[f] + "s"}
          </button>
        ))}
      </div>

      {accesoId && (
        <form onSubmit={guardarAcceso} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <h2 className="font-display text-lg sm:col-span-2">
            Acceso al portal — {items.find((p) => p.id === accesoId)?.nombre}
          </h2>
          <p className="sm:col-span-2 text-sm text-navy/60">
            Con esto el profesional puede entrar a{" "}
            <span className="font-semibold">/portal</span> a cargar sus propias notas o procederes, ver su
            liquidación y su historial. Pasale el usuario y la contraseña a mano.
          </p>
          <div>
            <label className="label">Usuario</label>
            <input
              className="input"
              required
              autoCapitalize="none"
              value={accesoForm.usuario}
              onChange={(e) => setAccesoForm({ ...accesoForm, usuario: e.target.value })}
            />
          </div>
          <div>
            <label className="label">
              {items.find((p) => p.id === accesoId)?.usuario ? "Nueva contraseña (opcional)" : "Contraseña"}
            </label>
            <input
              className="input"
              type="password"
              required={!items.find((p) => p.id === accesoId)?.usuario}
              placeholder={
                items.find((p) => p.id === accesoId)?.usuario ? "Dejar vacío para no cambiarla" : undefined
              }
              value={accesoForm.password}
              onChange={(e) => setAccesoForm({ ...accesoForm, password: e.target.value })}
            />
          </div>
          {accesoError && <p className="sm:col-span-2 text-sm text-red-600">{accesoError}</p>}
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={accesoGuardando}>
              {accesoGuardando ? "Guardando…" : "Guardar acceso"}
            </button>
            <button className="btn-ghost" type="button" onClick={() => setAccesoId(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              <option value="MEDICO">Médico</option>
              <option value="ENFERMERO">Enfermero</option>
            </select>
          </div>
          <div>
            <label className="label">Especialidad</label>
            <input className="input" value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} />
          </div>
          <div>
            <label className="label">Contacto</label>
            <input className="input" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
          </div>
          <div>
            <label className="label">N° Caja Profesional</label>
            <input className="input" value={form.cajaProfesional} onChange={(e) => setForm({ ...form, cajaProfesional: e.target.value })} />
          </div>
          <div>
            <label className="label">RUT / Monotributo</label>
            <input className="input" value={form.rutMonotributo} onChange={(e) => setForm({ ...form, rutMonotributo: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Vencimiento del seguro de responsabilidad civil</label>
            <input
              className="input"
              type="date"
              value={form.seguroRcVence}
              onChange={(e) => setForm({ ...form, seguroRcVence: e.target.value })}
            />
            <p className="text-xs text-navy/50 mt-1">
              Innegociable antes de asignarle un paciente. Si está vencido o vacío, aparece marcado en rojo en la lista.
            </p>
          </div>

          {esMedico ? (
            <>
              <div>
                <label className="label">Base mensual por disponibilidad</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="Vacío = usa el valor de Configuración"
                  value={form.baseMensual}
                  onChange={(e) => setForm({ ...form, baseMensual: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Tope mensual de liquidación</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="Vacío = usa el valor de Configuración"
                  value={form.topeMensual}
                  onChange={(e) => setForm({ ...form, topeMensual: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">% del proceder que cobra</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="Vacío = usa el 50% de Configuración"
                  value={form.pctProceder}
                  onChange={(e) => setForm({ ...form, pctProceder: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Zonas que cubre</label>
                <input className="input" value={form.zonas} onChange={(e) => setForm({ ...form, zonas: e.target.value })} />
              </div>
            </>
          )}

          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
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
                <th className="p-3">Nombre</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Caja / RUT</th>
                <th className="p-3">Seguro RC</th>
                <th className="p-3">Pago</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acceso al portal</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const vencido = seguroVencido(p.seguroRcVence);
                return (
                  <tr key={p.id} className="border-b border-navy/5 hover:bg-navy/[0.02]">
                    <td className="p-3 font-semibold">
                      {p.nombre}
                      {p.especialidad && <span className="block text-xs font-normal text-navy/50">{p.especialidad}</span>}
                    </td>
                    <td className="p-3">{ROL_PROFESIONAL_LABELS[p.rol]}</td>
                    <td className="p-3 text-xs">
                      {p.cajaProfesional || "—"} / {p.rutMonotributo || "—"}
                    </td>
                    <td className="p-3">
                      <span className={`badge ${vencido ? "bg-red-500/15 text-red-600" : "bg-teal/15 text-teal"}`}>
                        {vencido ? "Vencido o sin cargar" : new Date(p.seguroRcVence as string).toLocaleDateString("es-UY")}
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      {p.rol === "MEDICO"
                        ? `Base ${p.baseMensual ? money(p.baseMensual) : "(config)"} + por llamada`
                        : `${p.pctProceder ?? 50}% por proceder`}
                    </td>
                    <td className="p-3">
                      <span className={`badge ${p.estado === "ACTIVO" ? "bg-teal/15 text-teal" : "bg-navy/10 text-navy"}`}>
                        {p.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-3">
                      {p.usuario ? (
                        <span className="badge bg-teal/15 text-teal">{p.usuario}</span>
                      ) : (
                        <span className="badge bg-navy/10 text-navy">Sin acceso</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button className="text-teal hover:underline mr-3" onClick={() => abrirAcceso(p)}>
                        {p.usuario ? "Cambiar acceso" : "Dar acceso"}
                      </button>
                      {p.usuario && (
                        <button className="text-navy/60 hover:underline mr-3" onClick={() => quitarAcceso(p.id)}>
                          Quitar acceso
                        </button>
                      )}
                      <button className="text-teal hover:underline mr-3" onClick={() => abrirEdicion(p)}>
                        Editar
                      </button>
                      <button className="text-red-500 hover:underline" onClick={() => onDelete(p.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-navy/50">
                    No hay profesionales cargados.
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
