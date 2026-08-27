"use client";

import { useEffect, useState } from "react";
import { money, num, currentMonth, monthLabel, shiftMonth } from "@/lib/format";

type Dashboard = {
  mes: string;
  sueldos: string;
  cargas: string;
  provisionAguinaldoMes: string;
  provisionLicenciaMes: string;
  cajaNecesaria: string;
  costoRealTotal: string;
  fondoReserva: string;
  totalEsperado: string;
  totalCobrado: string;
  totalAtrasado: string;
  pctAtraso: string;
  margenReal: string;
  pctMargen: string;
  costoCuidadores: string;
  costoFacturadores: string;
  costoValoraciones: string;
  cantidadValoraciones: number;
  costoTotalEmpresa: string;
  clientesActivos: number;
  ingresoPromedioCliente: string;
  costoPromedioCliente: string;
  pctCostoCuidadores: string;
  pctCostoFacturadores: string;
  alertas: { tipo: string; mensaje: string }[];
  cantidadTrabajadoresActivos: number;
  cantidadClientesConCobro: number;
};

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "navy" | "teal" | "champagne" }) {
  const color = tone === "teal" ? "text-teal" : tone === "champagne" ? "text-champagne" : "text-navy";
  return (
    <div className="card p-5">
      <p className="label">{label}</p>
      <p className={`font-display text-2xl ${color}`}>{value}</p>
      {sub && <p className="text-xs text-navy/50 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [mes, setMes] = useState(currentMonth());
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?mes=${mes}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [mes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Panel de control</h1>
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

      {loading || !data ? (
        <p className="text-navy/60">Cargando…</p>
      ) : (
        <>
          {data.alertas.length > 0 && (
            <div className="space-y-2">
              {data.alertas.map((a, i) => (
                <div key={i} className="card p-4 border-l-4 border-champagne bg-champagne/10 text-sm">
                  {a.mensaje}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Stat
              label="Caja necesaria este mes"
              value={money(data.cajaNecesaria)}
              sub="Sueldos + BPS/BSE + pagos de aguinaldo/licencia del mes"
              tone="navy"
            />
            <Stat
              label="Fondo de reserva acumulado"
              value={money(data.fondoReserva)}
              sub="Provisionado y no pagado (aguinaldo + licencia)"
              tone="champagne"
            />
            <Stat
              label="Costo real total del mes"
              value={money(data.costoRealTotal)}
              sub="Incluye provisión, no solo lo pagado en mano"
              tone="teal"
            />
            <Stat label="Sueldos nominales" value={money(data.sueldos)} sub="Pagado en mano" />
            <Stat label="Cargas corrientes (BPS+BSE)" value={money(data.cargas)} />
            <Stat
              label="Provisión aguinaldo + licencia del mes"
              value={money(Number(data.provisionAguinaldoMes) + Number(data.provisionLicenciaMes))}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-display text-lg mb-3">Cobranza del mes</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total esperado</span>
                  <span className="font-semibold">{money(data.totalEsperado)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cobrado</span>
                  <span className="font-semibold text-teal">{money(data.totalCobrado)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pendiente/atrasado</span>
                  <span className="font-semibold text-red-600">{money(data.totalAtrasado)}</span>
                </div>
                <div className="flex justify-between border-t border-navy/10 pt-2">
                  <span>% de atraso</span>
                  <span className="font-semibold">{num(data.pctAtraso, 1)}%</span>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <h2 className="font-display text-lg mb-3">Rentabilidad de la empresa</h2>
              <p className="text-sm text-navy/60 mb-2">
                Ingresos esperados − costo de cuidadores (con provisión) − costo de médicos y enfermería
              </p>
              <p className={`font-display text-3xl ${Number(data.margenReal) >= 0 ? "text-teal" : "text-red-600"}`}>
                {money(data.margenReal)}
              </p>
              <p className="text-xs text-navy/50 mt-1">{num(data.pctMargen, 1)}% de margen sobre lo facturado</p>
              <div className="mt-3 space-y-1.5 text-sm border-t border-navy/10 pt-3">
                <div className="flex justify-between">
                  <span className="text-navy/60">Ingresos esperados</span>
                  <span className="font-semibold">{money(data.totalEsperado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/60">Costo de cuidadores</span>
                  <span className="font-semibold text-red-600">− {money(data.costoCuidadores)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/60">Costo de médicos y enfermería</span>
                  <span className="font-semibold text-red-600">− {money(data.costoFacturadores)}</span>
                </div>
                {data.cantidadValoraciones > 0 && (
                  <div className="flex justify-between text-xs text-navy/40 pl-3">
                    <span>de las cuales, {data.cantidadValoraciones} valoración{data.cantidadValoraciones === 1 ? "" : "es"} inicial{data.cantidadValoraciones === 1 ? "" : "es"} (gratis al cliente)</span>
                    <span>− {money(data.costoValoraciones)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg mb-3">KPIs del mes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Clientes facturados este mes" value={String(data.clientesActivos)} tone="navy" />
              <Stat
                label="Ingreso promedio por cliente"
                value={money(data.ingresoPromedioCliente)}
                tone="teal"
              />
              <Stat
                label="Costo promedio por cliente"
                value={money(data.costoPromedioCliente)}
                sub="Cuidador + médico/enfermería"
                tone="champagne"
              />
              <Stat
                label="Margen sobre lo facturado"
                value={`${num(data.pctMargen, 1)}%`}
                tone={Number(data.pctMargen) >= 0 ? "teal" : undefined}
              />
              <Stat
                label="Costo de cuidadores / ingresos"
                value={`${num(data.pctCostoCuidadores, 1)}%`}
              />
              <Stat
                label="Costo de médicos y enfermería / ingresos"
                value={`${num(data.pctCostoFacturadores, 1)}%`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
