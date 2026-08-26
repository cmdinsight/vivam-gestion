import { prisma } from "./prisma";
import { Prisma, PlanContratado, Modalidad } from "@prisma/client";
import { getConfiguracion } from "./payroll";
import { esDiurno } from "./turnos";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

// IVA fijo para la tarifa por hora sin plan (no editable, a diferencia de las
// demás tasas de Configuración).
export const IVA_TARIFA_HORA_PCT = 10;

// precioBase = precio de tarifa llena (100%), calculado de forma que
// precioBase * (1 - 5%) = el "Total cliente" de la modalidad mensual rotativo
// de la Matriz de precios Vivam.
const DEFAULTS_PLAN: Record<PlanContratado, { horasMes: number; precioBase: number; costoCuidadorMes: number; cupoProcederesMes: number; alertaAnual: boolean }> = {
  ESENCIAL_LUNES_VIERNES: { horasMes: 160, precioBase: 61600, costoCuidadorMes: 36800, cupoProcederesMes: 2, alertaAnual: true },
  ESENCIAL_COMPLETO: { horasMes: 240, precioBase: 92400, costoCuidadorMes: 55200, cupoProcederesMes: 2, alertaAnual: true },
  EXTENDIDO: { horasMes: 480, precioBase: 184800, costoCuidadorMes: 110400, cupoProcederesMes: 5, alertaAnual: false },
  INTEGRAL: { horasMes: 720, precioBase: 304920, costoCuidadorMes: 175920, cupoProcederesMes: 10, alertaAnual: false },
};

const DEFAULTS_MODALIDAD: Record<Modalidad, number> = {
  MENSUAL: 5,
  TRIMESTRAL: 7.85,
  SEMESTRAL: 9.75,
  ANUAL: 12.6,
};

export async function getPlanesConfig() {
  const existentes = await prisma.planConfig.findMany();
  const existentesMap = new Map(existentes.map((p) => [p.plan, p]));

  const faltantes = (Object.keys(DEFAULTS_PLAN) as PlanContratado[]).filter((p) => !existentesMap.has(p));
  if (faltantes.length > 0) {
    await prisma.planConfig.createMany({
      data: faltantes.map((plan) => ({ plan, ...DEFAULTS_PLAN[plan] })),
    });
    return prisma.planConfig.findMany();
  }
  return existentes;
}

export async function getModalidadesConfig() {
  const existentes = await prisma.modalidadConfig.findMany();
  const existentesMap = new Map(existentes.map((m) => [m.modalidad, m]));

  const faltantes = (Object.keys(DEFAULTS_MODALIDAD) as Modalidad[]).filter((m) => !existentesMap.has(m));
  if (faltantes.length > 0) {
    await prisma.modalidadConfig.createMany({
      data: faltantes.map((modalidad) => ({ modalidad, descuentoPct: DEFAULTS_MODALIDAD[modalidad] })),
    });
    return prisma.modalidadConfig.findMany();
  }
  return existentes;
}

/**
 * Calcula el precio mensual que se le cobra al cliente para un plan +
 * modalidad dados: precioBase * (1 - descuento de la modalidad). Redondeado
 * al peso, sin decimales.
 */
export async function calcularPrecioCliente(plan: PlanContratado, modalidad: Modalidad) {
  const [planes, modalidades] = await Promise.all([getPlanesConfig(), getModalidadesConfig()]);
  const planCfg = planes.find((p) => p.plan === plan);
  const modCfg = modalidades.find((m) => m.modalidad === modalidad);
  if (!planCfg || !modCfg) throw new Error("Plan o modalidad sin configuración");

  const precio = D(planCfg.precioBase).mul(D(1).sub(D(modCfg.descuentoPct).div(100)));
  return { precio: Math.round(precio.toNumber()), planCfg, modCfg };
}

export function debeAlertarMargen(planCfg: { alertaAnual: boolean }, modalidad: Modalidad) {
  return planCfg.alertaAnual && modalidad === "ANUAL";
}

function diasEnMes(mes: string): number {
  const [y, m] = mes.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * Si el mes facturado es el primer mes de servicio del cliente (el de su
 * fechaInicio) y arrancó después del día 1, se cobra proporcional: precio
 * mensual × (días utilizados este mes ÷ días totales del mes), por regla de
 * tres. Los meses siguientes se cobran completos. Devuelve null si no aplica
 * prorrateo (se debe cobrar el precio mensual completo).
 */
export function calcularProrateoPrimerMes(precioMensual: Prisma.Decimal.Value, fechaInicio: Date, mes: string) {
  const mesInicio = `${fechaInicio.getUTCFullYear()}-${String(fechaInicio.getUTCMonth() + 1).padStart(2, "0")}`;
  if (mesInicio !== mes) return null;

  const diaInicio = fechaInicio.getUTCDate();
  if (diaInicio <= 1) return null;

  const totalDias = diasEnMes(mes);
  const diasUsados = totalDias - diaInicio + 1;
  const monto = Math.round(D(precioMensual).mul(diasUsados).div(totalDias).toNumber());
  return { monto, diasUsados, totalDias };
}

/**
 * Calcula el monto a cobrar a un cliente facturado "por hora sin plan" para un
 * mes dado, a partir de sus Turnos reales (diurnos/nocturnos, excluyendo
 * NO_TRABAJADO) por la tarifa de cliente vigente + IVA fijo del 10%.
 */
export async function calcularMontoPorHora(clienteId: string, mes: string) {
  const [turnos, cfg] = await Promise.all([
    prisma.turno.findMany({
      where: { clienteId, mes, estado: { not: "NO_TRABAJADO" } },
      select: { horas: true, horaInicio: true },
    }),
    getConfiguracion(),
  ]);

  let horasDiurnas = D(0);
  let horasNocturnas = D(0);
  let subtotal = D(0);
  for (const t of turnos) {
    if (esDiurno(t.horaInicio)) {
      horasDiurnas = horasDiurnas.add(t.horas);
      subtotal = subtotal.add(D(t.horas).mul(cfg.tarifaHoraClienteDiurna));
    } else {
      horasNocturnas = horasNocturnas.add(t.horas);
      subtotal = subtotal.add(D(t.horas).mul(cfg.tarifaHoraClienteNocturna));
    }
  }

  const iva = subtotal.mul(IVA_TARIFA_HORA_PCT).div(100);
  return {
    horasDiurnas,
    horasNocturnas,
    subtotal,
    iva,
    total: Math.round(subtotal.add(iva).toNumber()),
  };
}
