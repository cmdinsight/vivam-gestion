import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { esDiurno } from "./turnos";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export async function getConfiguracion() {
  const cfg = await prisma.configuracion.findUnique({ where: { id: 1 } });
  if (cfg) return cfg;
  return prisma.configuracion.create({
    data: {
      id: 1,
      bpsPatronalPct: 19.5,
      bsePct: 3,
      aguinaldoDivisor: 12,
      licenciaDiasAnio: 20,
      licenciaPct: 8.33,
      tarifaHoraDiurna: 230,
      tarifaHoraNocturna: 273,
    },
  });
}

/**
 * Calcula el costo de un trabajador para un mes dado. No persiste nada.
 *
 * - tipoTarifa HORA: el costo total sale de sus turnos reales del mes por la
 *   tarifa horaria FIJA de Vivam (diurna/nocturna, ya incluye cargas). El
 *   sueldo nominal se despeja hacia atrás: sueldoNominal = costoTotal / (1 +
 *   %BPS + %BSE + %Aguinaldo + %Licencia). El costo total nunca cambia aunque
 *   se ajusten los % — sólo cambia cómo se reparte internamente.
 * - tipoTarifa MENSUAL: sueldo nominal fijo pactado; las cargas se suman
 *   arriba (modelo aditivo tradicional).
 */
export async function calcularMes(trabajadorId: string, mes: string) {
  const [trabajador, cfg] = await Promise.all([
    prisma.trabajador.findUniqueOrThrow({ where: { id: trabajadorId } }),
    getConfiguracion(),
  ]);

  const tasaProvisiones = D(cfg.bpsPatronalPct)
    .div(100)
    .add(D(cfg.bsePct).div(100))
    .add(D(1).div(cfg.aguinaldoDivisor))
    .add(D(cfg.licenciaPct).div(100));

  let horasTotales: Prisma.Decimal;
  let sueldoNominal: Prisma.Decimal;

  if (trabajador.tipoTarifa === "HORA") {
    const turnos = await prisma.turno.findMany({
      where: { trabajadorId, mes, estado: { not: "NO_TRABAJADO" } },
      select: { horas: true, horaInicio: true },
    });
    horasTotales = turnos.reduce((acc, t) => acc.add(t.horas), D(0));
    const costoTotalHoras = turnos.reduce((acc, t) => {
      const tarifa = esDiurno(t.horaInicio) ? cfg.tarifaHoraDiurna : cfg.tarifaHoraNocturna;
      return acc.add(D(t.horas).mul(tarifa));
    }, D(0));
    sueldoNominal = costoTotalHoras.div(D(1).add(tasaProvisiones));
  } else {
    horasTotales = D(0);
    sueldoNominal = D(trabajador.tarifa);
  }

  const bpsPatronal = sueldoNominal.mul(cfg.bpsPatronalPct).div(100);
  const bse = sueldoNominal.mul(cfg.bsePct).div(100);
  const aguinaldoProvision = sueldoNominal.div(cfg.aguinaldoDivisor);
  const licenciaProvision = sueldoNominal.mul(cfg.licenciaPct).div(100);

  return {
    trabajador,
    cfg,
    horasTotales,
    sueldoNominal,
    bpsPatronal,
    bse,
    aguinaldoProvision,
    licenciaProvision,
    cargasCorrientes: bpsPatronal.add(bse),
    costoTotalMes: sueldoNominal.add(bpsPatronal).add(bse).add(aguinaldoProvision).add(licenciaProvision),
  };
}

/**
 * Cierra el mes para un trabajador: guarda la liquidación (si no existe ya)
 * y acredita los movimientos de provisión de aguinaldo y licencia.
 * Idempotente por trabajador+mes gracias al unique constraint.
 */
export async function procesarMes(trabajadorId: string, mes: string) {
  const existe = await prisma.liquidacionMensual.findUnique({
    where: { trabajadorId_mes: { trabajadorId, mes } },
  });
  if (existe) return existe;

  const calc = await calcularMes(trabajadorId, mes);

  return prisma.$transaction(async (tx) => {
    const liq = await tx.liquidacionMensual.create({
      data: {
        trabajadorId,
        mes,
        horasTotales: calc.horasTotales,
        sueldoNominal: calc.sueldoNominal,
        bpsPatronal: calc.bpsPatronal,
        bse: calc.bse,
        aguinaldoProvision: calc.aguinaldoProvision,
        licenciaProvision: calc.licenciaProvision,
      },
    });
    await tx.movimientoProvision.create({
      data: {
        trabajadorId,
        tipo: "AGUINALDO",
        mes,
        monto: calc.aguinaldoProvision,
        esPago: false,
        descripcion: `Provisión aguinaldo ${mes}`,
      },
    });
    await tx.movimientoProvision.create({
      data: {
        trabajadorId,
        tipo: "LICENCIA",
        mes,
        monto: calc.licenciaProvision,
        esPago: false,
        descripcion: `Provisión licencia + salario vacacional ${mes}`,
      },
    });
    return liq;
  });
}

export async function saldoProvision(trabajadorId: string, tipo: "AGUINALDO" | "LICENCIA") {
  const agg = await prisma.movimientoProvision.aggregate({
    where: { trabajadorId, tipo },
    _sum: { monto: true },
  });
  return agg._sum.monto ?? D(0);
}

export async function registrarPago(
  trabajadorId: string,
  tipo: "AGUINALDO" | "LICENCIA",
  monto: Prisma.Decimal.Value,
  mes: string,
  descripcion?: string
) {
  return prisma.movimientoProvision.create({
    data: {
      trabajadorId,
      tipo,
      mes,
      monto: D(monto).neg(),
      esPago: true,
      descripcion: descripcion ?? `Pago de ${tipo.toLowerCase()} - ${mes}`,
    },
  });
}
