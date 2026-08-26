"use client";

import { useEffect, useState } from "react";
import { PLAN_LABELS, MODALIDAD_LABELS, UNIDAD_LABELS } from "@/lib/format";

type Config = {
  bpsPatronalPct: string;
  bsePct: string;
  aguinaldoDivisor: string;
  licenciaDiasAnio: number;
  licenciaPct: string;
  tarifaHoraDiurna: string;
  tarifaHoraNocturna: string;
  tarifaHoraClienteDiurna: string;
  tarifaHoraClienteNocturna: string;
};

const IVA_TARIFA_HORA_PCT = 10;

type PlanCfg = {
  plan: string;
  horasMes: number;
  precioBase: string;
  costoCuidadorMes: string;
  cupoProcederesMes: number;
  alertaAnual: boolean;
};

type ModalidadCfg = {
  modalidad: string;
  descuentoPct: string;
};

type ExtraServicio = {
  id: string;
  nombre: string;
  precioSinIva: string;
  unidad: string;
  aplicaIva: boolean;
  activo: boolean;
};

const EXTRA_IVA_PCT = 10;

const EXTRA_NUEVO_VACIO = { nombre: "", precioSinIva: "0", unidad: "POR_VISITA", aplicaIva: true };

export default function ConfiguracionPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [msgCfg, setMsgCfg] = useState("");
  const [planes, setPlanes] = useState<PlanCfg[]>([]);
  const [modalidades, setModalidades] = useState<ModalidadCfg[]>([]);
  const [msgPlanes, setMsgPlanes] = useState("");
  const [extras, setExtras] = useState<ExtraServicio[]>([]);
  const [msgExtras, setMsgExtras] = useState("");
  const [nuevoExtra, setNuevoExtra] = useState(EXTRA_NUEVO_VACIO);
  const [mostrarNuevoExtra, setMostrarNuevoExtra] = useState(false);

  function loadExtras() {
    fetch("/api/extras")
      .then((r) => r.json())
      .then(setExtras);
  }

  useEffect(() => {
    fetch("/api/configuracion")
      .then((r) => r.json())
      .then(setCfg);
    fetch("/api/planes")
      .then((r) => r.json())
      .then((d) => {
        setPlanes(d.planes);
        setModalidades(d.modalidades);
      });
    loadExtras();
  }, []);

  async function onSubmitCfg(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    const res = await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bpsPatronalPct: parseFloat(cfg.bpsPatronalPct),
        bsePct: parseFloat(cfg.bsePct),
        aguinaldoDivisor: parseFloat(cfg.aguinaldoDivisor),
        licenciaDiasAnio: parseInt(String(cfg.licenciaDiasAnio)),
        licenciaPct: parseFloat(cfg.licenciaPct),
        tarifaHoraDiurna: parseFloat(cfg.tarifaHoraDiurna),
        tarifaHoraNocturna: parseFloat(cfg.tarifaHoraNocturna),
        tarifaHoraClienteDiurna: parseFloat(cfg.tarifaHoraClienteDiurna),
        tarifaHoraClienteNocturna: parseFloat(cfg.tarifaHoraClienteNocturna),
      }),
    });
    setMsgCfg(res.ok ? "Configuración guardada." : "Error al guardar.");
  }

  function updatePlan(plan: string, field: keyof PlanCfg, value: string | number | boolean) {
    setPlanes((prev) => prev.map((p) => (p.plan === plan ? { ...p, [field]: value } : p)));
  }

  function updateModalidad(modalidad: string, value: string) {
    setModalidades((prev) => prev.map((m) => (m.modalidad === modalidad ? { ...m, descuentoPct: value } : m)));
  }

  async function onSubmitPlanes(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/planes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planes: planes.map((p) => ({
          plan: p.plan,
          horasMes: parseInt(String(p.horasMes)),
          precioBase: parseFloat(p.precioBase),
          costoCuidadorMes: parseFloat(p.costoCuidadorMes),
          cupoProcederesMes: parseInt(String(p.cupoProcederesMes)),
          alertaAnual: p.alertaAnual,
        })),
        modalidades: modalidades.map((m) => ({ modalidad: m.modalidad, descuentoPct: parseFloat(m.descuentoPct) })),
      }),
    });
    setMsgPlanes(res.ok ? "Planes y modalidades guardados." : "Error al guardar.");
  }

  function updateExtra(id: string, field: keyof ExtraServicio, value: string | boolean) {
    setExtras((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  async function onSubmitExtras(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/extras", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        extras: extras.map((x) => ({
          id: x.id,
          nombre: x.nombre,
          precioSinIva: parseFloat(x.precioSinIva),
          unidad: x.unidad,
          aplicaIva: x.aplicaIva,
          activo: x.activo,
        })),
      }),
    });
    setMsgExtras(res.ok ? "Extras guardados." : "Error al guardar.");
  }

  async function crearExtra(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/extras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nuevoExtra, precioSinIva: parseFloat(nuevoExtra.precioSinIva) }),
    });
    setNuevoExtra(EXTRA_NUEVO_VACIO);
    setMostrarNuevoExtra(false);
    loadExtras();
  }

  async function eliminarExtra(id: string) {
    if (!confirm("¿Eliminar este extra del catálogo?")) return;
    await fetch(`/api/extras/${id}`, { method: "DELETE" });
    loadExtras();
  }

  if (!cfg) return <p className="text-navy/60">Cargando…</p>;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl">Configuración</h1>
        <p className="text-sm text-navy/60 mt-1">
          Todos estos valores son datos maestros editables — nada queda fijo en el código. Ajustalos según lo que
          confirme tu contador o lo que decida el negocio; los cambios aplican para los próximos cálculos.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Tasas y cargas sociales</h2>
        <form onSubmit={onSubmitCfg} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">BPS patronal (%)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={cfg.bpsPatronalPct}
              onChange={(e) => setCfg({ ...cfg, bpsPatronalPct: e.target.value })}
            />
          </div>
          <div>
            <label className="label">BSE (%)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={cfg.bsePct}
              onChange={(e) => setCfg({ ...cfg, bsePct: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Divisor de aguinaldo (sueldo nominal / N)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={cfg.aguinaldoDivisor}
              onChange={(e) => setCfg({ ...cfg, aguinaldoDivisor: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Licencia + salario vacacional (% del sueldo nominal)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={cfg.licenciaPct}
              onChange={(e) => setCfg({ ...cfg, licenciaPct: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Días de licencia por año (referencia legal/RRHH)</label>
            <input
              className="input"
              type="number"
              value={cfg.licenciaDiasAnio}
              onChange={(e) => setCfg({ ...cfg, licenciaDiasAnio: parseInt(e.target.value) })}
            />
          </div>
          <div className="sm:col-span-2 border-t border-navy/10 pt-4">
            <p className="label mb-2">Tarifa horaria fija del cuidador (costo total, ya incluye cargas)</p>
          </div>
          <div>
            <label className="label">Diurna, 06:00-20:00 ($/hora)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={cfg.tarifaHoraDiurna}
              onChange={(e) => setCfg({ ...cfg, tarifaHoraDiurna: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Nocturna, 20:00-06:00 ($/hora)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={cfg.tarifaHoraNocturna}
              onChange={(e) => setCfg({ ...cfg, tarifaHoraNocturna: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 border-t border-navy/10 pt-4">
            <p className="label mb-2">
              Tarifa por hora al cliente, sin plan mensual (precio sin IVA — el IVA se aplica fijo al{" "}
              {IVA_TARIFA_HORA_PCT}%, no editable)
            </p>
          </div>
          <div>
            <label className="label">Diurna, 06:00-20:00 ($/hora, sin IVA)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={cfg.tarifaHoraClienteDiurna}
              onChange={(e) => setCfg({ ...cfg, tarifaHoraClienteDiurna: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Nocturna, 20:00-06:00 ($/hora, sin IVA)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={cfg.tarifaHoraClienteNocturna}
              onChange={(e) => setCfg({ ...cfg, tarifaHoraClienteNocturna: e.target.value })}
            />
          </div>
          {msgCfg && <p className="text-sm text-teal sm:col-span-2">{msgCfg}</p>}
          <div className="sm:col-span-2">
            <button className="btn-primary" type="submit">
              Guardar tasas y tarifas
            </button>
          </div>
        </form>
        <p className="text-xs text-navy/40">
          Para cuidadores por hora, el sueldo nominal se despeja de la tarifa fija: sueldo nominal = costo total ÷ (1
          + BPS + BSE + aguinaldo + licencia). El costo total por hora (diurna/nocturna) nunca cambia al ajustar los
          %, sólo cambia cómo se reparte internamente entre sueldo y cargas.
        </p>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-navy/10 text-navy/60">
                <th className="p-2">Modalidad</th>
                <th className="p-2">Precio/hora (sin IVA)</th>
                <th className="p-2">+ IVA {IVA_TARIFA_HORA_PCT}%</th>
                <th className="p-2">Total final cliente</th>
                <th className="p-2">Costo cuidador</th>
                <th className="p-2">Margen bruto $</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Hora diurna (06:00-20:00)", precio: cfg.tarifaHoraClienteDiurna, costo: cfg.tarifaHoraDiurna },
                { label: "Hora nocturna (20:00-06:00)", precio: cfg.tarifaHoraClienteNocturna, costo: cfg.tarifaHoraNocturna },
              ].map((row) => {
                const precio = parseFloat(row.precio) || 0;
                const costo = parseFloat(row.costo) || 0;
                const iva = precio * (IVA_TARIFA_HORA_PCT / 100);
                const total = precio + iva;
                return (
                  <tr key={row.label} className="border-b border-navy/5">
                    <td className="p-2 font-semibold">{row.label}</td>
                    <td className="p-2">${precio.toFixed(0)}</td>
                    <td className="p-2">${iva.toFixed(0)}</td>
                    <td className="p-2">${total.toFixed(0)}</td>
                    <td className="p-2 text-teal">${costo.toFixed(0)}</td>
                    <td className="p-2 text-teal">${(precio - costo).toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-navy/40">
          Mínimo recomendado por visita: 4 horas. Por debajo, el costo logístico del cuidador no se cubre.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Planes oficiales Vivam</h2>
        <form onSubmit={onSubmitPlanes}>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-navy/10 text-navy/60">
                  <th className="p-2">Plan</th>
                  <th className="p-2">Horas/mes</th>
                  <th className="p-2">Precio base (100%, $)</th>
                  <th className="p-2">Costo cuidador/mes ($)</th>
                  <th className="p-2">Cupo procederes/mes</th>
                  <th className="p-2">Alertar en Anual</th>
                </tr>
              </thead>
              <tbody>
                {planes.map((p) => (
                  <tr key={p.plan} className="border-b border-navy/5">
                    <td className="p-2 font-semibold">{PLAN_LABELS[p.plan]}</td>
                    <td className="p-2">
                      <input
                        className="input"
                        type="number"
                        value={p.horasMes}
                        onChange={(e) => updatePlan(p.plan, "horasMes", e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={p.precioBase}
                        onChange={(e) => updatePlan(p.plan, "precioBase", e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={p.costoCuidadorMes}
                        onChange={(e) => updatePlan(p.plan, "costoCuidadorMes", e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="input"
                        type="number"
                        value={p.cupoProcederesMes}
                        onChange={(e) => updatePlan(p.plan, "cupoProcederesMes", e.target.value)}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.alertaAnual}
                        onChange={(e) => updatePlan(p.plan, "alertaAnual", e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-base mt-5 mb-2">Modalidades de compromiso</h3>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-navy/10 text-navy/60">
                  <th className="p-2">Modalidad</th>
                  <th className="p-2">Descuento total sobre precio base (%)</th>
                </tr>
              </thead>
              <tbody>
                {modalidades.map((m) => (
                  <tr key={m.modalidad} className="border-b border-navy/5">
                    <td className="p-2 font-semibold">{MODALIDAD_LABELS[m.modalidad]}</td>
                    <td className="p-2">
                      <input
                        className="input max-w-[10rem]"
                        type="number"
                        step="0.01"
                        value={m.descuentoPct}
                        onChange={(e) => updateModalidad(m.modalidad, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {msgPlanes && <p className="text-sm text-teal mt-3">{msgPlanes}</p>}
          <button className="btn-primary mt-3" type="submit">
            Guardar planes y modalidades
          </button>
        </form>
        <p className="text-xs text-navy/40">
          El precio mensual que se le cobra a cada cliente se calcula solo: precio base del plan × (1 − descuento de
          la modalidad elegida). No se tipea a mano en la ficha del cliente.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Extras y procederes</h2>
          <button className="btn-ghost text-sm" type="button" onClick={() => setMostrarNuevoExtra(!mostrarNuevoExtra)}>
            + Agregar extra
          </button>
        </div>
        <p className="text-xs text-navy/40">
          Catálogo de servicios cotizables aparte del plan (ej. visita médica, reporte PDF). Todavía es solo el
          catálogo de precios — no está conectado a la generación automática de Cobros.
        </p>

        {mostrarNuevoExtra && (
          <form onSubmit={crearExtra} className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="label">Nombre</label>
              <input
                className="input"
                required
                value={nuevoExtra.nombre}
                onChange={(e) => setNuevoExtra({ ...nuevoExtra, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Precio sin IVA ($)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={nuevoExtra.precioSinIva}
                onChange={(e) => setNuevoExtra({ ...nuevoExtra, precioSinIva: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Unidad</label>
              <select
                className="input"
                value={nuevoExtra.unidad}
                onChange={(e) => setNuevoExtra({ ...nuevoExtra, unidad: e.target.value })}
              >
                <option value="POR_VISITA">Por visita</option>
                <option value="POR_MES">Por mes</option>
              </select>
            </div>
            <div className="sm:col-span-4 flex gap-2">
              <button className="btn-primary text-sm" type="submit">
                Crear extra
              </button>
              <button className="btn-ghost text-sm" type="button" onClick={() => setMostrarNuevoExtra(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <form onSubmit={onSubmitExtras}>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-navy/10 text-navy/60">
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Precio sin IVA</th>
                  <th className="p-2">Unidad</th>
                  <th className="p-2">+ IVA {EXTRA_IVA_PCT}%</th>
                  <th className="p-2">Total cliente</th>
                  <th className="p-2">Activo</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {extras.map((x) => {
                  const precio = parseFloat(x.precioSinIva) || 0;
                  const iva = x.aplicaIva ? precio * (EXTRA_IVA_PCT / 100) : 0;
                  return (
                    <tr key={x.id} className="border-b border-navy/5">
                      <td className="p-2">
                        <input
                          className="input"
                          value={x.nombre}
                          onChange={(e) => updateExtra(x.id, "nombre", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="input max-w-[8rem]"
                          type="number"
                          step="0.01"
                          value={x.precioSinIva}
                          onChange={(e) => updateExtra(x.id, "precioSinIva", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <select
                          className="input"
                          value={x.unidad}
                          onChange={(e) => updateExtra(x.id, "unidad", e.target.value)}
                        >
                          <option value="POR_VISITA">{UNIDAD_LABELS.POR_VISITA}</option>
                          <option value="POR_MES">{UNIDAD_LABELS.POR_MES}</option>
                        </select>
                      </td>
                      <td className="p-2">${iva.toFixed(0)}</td>
                      <td className="p-2 font-semibold text-teal">${(precio + iva).toFixed(0)}</td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={x.activo}
                          onChange={(e) => updateExtra(x.id, "activo", e.target.checked)}
                        />
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          className="text-red-500 hover:underline text-xs"
                          onClick={() => eliminarExtra(x.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {extras.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-navy/50">
                      Sin extras cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {msgExtras && <p className="text-sm text-teal mt-3">{msgExtras}</p>}
          {extras.length > 0 && (
            <button className="btn-primary mt-3" type="submit">
              Guardar extras
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
