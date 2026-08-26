"use client";

import { useEffect, useState } from "react";
import { PLAN_LABELS, MODALIDAD_LABELS } from "@/lib/format";

type Config = {
  bpsPatronalPct: string;
  bsePct: string;
  aguinaldoDivisor: string;
  licenciaDiasAnio: number;
  licenciaPct: string;
  tarifaHoraDiurna: string;
  tarifaHoraNocturna: string;
};

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

export default function ConfiguracionPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [msgCfg, setMsgCfg] = useState("");
  const [planes, setPlanes] = useState<PlanCfg[]>([]);
  const [modalidades, setModalidades] = useState<ModalidadCfg[]>([]);
  const [msgPlanes, setMsgPlanes] = useState("");

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
    </div>
  );
}
