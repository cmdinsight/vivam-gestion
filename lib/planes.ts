import { prisma } from "./prisma";
import { Prisma, PlanContratado, Modalidad } from "@prisma/client";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

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
