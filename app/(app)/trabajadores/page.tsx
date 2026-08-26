"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money, dateInput } from "@/lib/format";

type Trabajador = {
  id: string;
  nombre: string;
  contacto: string | null;
  fechaIngreso: string;
  categoriaLaboral: string | null;
  tipoTarifa: string;
  tarifa: string;
  cuentaBancaria: string | null;
  estado: string;
};

const EMPTY = {
  nombre: "",
  contacto: "",
  fechaIngreso: dateInput(new Date()),
  categoriaLaboral: "",
  tipoTarifa: "HORA",
  tarifa: "0",
  cuentaBancaria: "",
  estado: "ACTIVO",
  notas: "",
};

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function load() {
    setLoading(true);
    fetch("/api/trabajadores")
      .then((r) => r.json())
      .then((d) => {
        setTrabajadores(d);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/trabajadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tarifa: parseFloat(form.tarifa) }),
    });
    setShowForm(false);
    setForm(EMPTY);
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este cuidador y todo su historial de turnos/liquidaciones?")) return;
    await fetch(`/api/trabajadores/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">Cuidadores</h1>
        <div className="flex gap-2">
          <a href="/api/export/trabajadores" className="btn-ghost text-sm">
            Exportar CSV
          </a>
          <button className="btn-primary text-sm" onClick={() => setShowForm(true)}>
            + Nuevo cuidador
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="label">Contacto</label>
            <input className="input" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
          </div>
          <div>
            <label className="label">Fecha de ingreso</label>
            <input
              className="input"
              type="date"
              required
              value={form.fechaIngreso}
              onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Categoría laboral</label>
            <input
              className="input"
              value={form.categoriaLaboral}
              onChange={(e) => setForm({ ...form, categoriaLaboral: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Tipo de tarifa</label>
            <select className="input" value={form.tipoTarifa} onChange={(e) => setForm({ ...form, tipoTarifa: e.target.value })}>
              <option value="HORA">Por hora</option>
              <option value="MENSUAL">Mensual fijo</option>
            </select>
          </div>
          {form.tipoTarifa === "MENSUAL" ? (
            <div>
              <label className="label">Tarifa ($/mes)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                required
                value={form.tarifa}
                onChange={(e) => setForm({ ...form, tarifa: e.target.value })}
              />
            </div>
          ) : (
            <div>
              <label className="label">Tarifa</label>
              <p className="text-sm text-navy/50 pt-2">
                Se paga según la tarifa fija diurna/nocturna por turno, definida en Configuración.
              </p>
            </div>
          )}
          <div>
            <label className="label">Cuenta bancaria</label>
            <input
              className="input"
              value={form.cuentaBancaria}
              onChange={(e) => setForm({ ...form, cuentaBancaria: e.target.value })}
            />
          </div>
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
                <th className="p-3">Categoría</th>
                <th className="p-3">Tarifa</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => (
                <tr key={t.id} className="border-b border-navy/5 hover:bg-navy/[0.02]">
                  <td className="p-3 font-semibold">
                    <Link href={`/trabajadores/${t.id}`} className="hover:text-teal">
                      {t.nombre}
                    </Link>
                  </td>
                  <td className="p-3">{t.categoriaLaboral}</td>
                  <td className="p-3">
                    {t.tipoTarifa === "HORA" ? "Según turno (config)" : `${money(t.tarifa)} / mes`}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${t.estado === "ACTIVO" ? "bg-teal/15 text-teal" : "bg-navy/10 text-navy"}`}>
                      {t.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link href={`/trabajadores/${t.id}`} className="text-teal hover:underline mr-3">
                      Ver / turnos
                    </Link>
                    <button className="text-red-500 hover:underline" onClick={() => onDelete(t.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {trabajadores.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-navy/50">
                    No hay cuidadores registrados.
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
