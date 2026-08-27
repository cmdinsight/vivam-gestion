import { prisma } from "./prisma";
import { Prisma, PlanContratado, TipoLlamada } from "@prisma/client";
import { getPlanesConfig } from "./planes";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export async function getConfigFacturadores() {
  const cfg = await prisma.configuracionFacturadores.findUnique({ where: { id: 1 } });
  if (cfg) return cfg;
  return prisma.configuracionFacturadores.create({ data: { id: 1 } });
}

/** Tarifa que corresponde a una llamada según su tipo. */
export function tarifaPorTipo(
  tipo: TipoLlamada,
  cfg: { tarifaProgramada: Prisma.Decimal; tarifaGuardia: Prisma.Decimal; tarifaEmergencia: Prisma.Decimal }
) {
  if (tipo === "PROGRAMADA") return D(cfg.tarifaProgramada);
  if (tipo === "GUARDIA") return D(cfg.tarifaGuardia);
  return D(cfg.tarifaEmergencia);
}

export function mesDe(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Monto que se le liquida al médico por una nota de guardia.
 * REGLA: sin nota cargada en la historia clínica, la llamada no se paga.
 */
export async function montoDeNota(tipo: TipoLlamada, notaCargada: boolean) {
  if (!notaCargada) return D(0);
  const cfg = await getConfigFacturadores();
  return tarifaPorTipo(tipo, cfg);
}

/**
 * Registra un proceder de enfermería resolviendo, en una transacción:
 *  - qué número de proceder del mes es para ese paciente
 *  - el cupo del plan que tiene contratado
 *  - si entra o no en el cupo
 *  - cuánto se le cobra al cliente (0 si entra en el cupo) y cuánto se le
 *    paga al enfermero (siempre, entre o no en el cupo)
 *
 * Los montos quedan congelados en la fila: si mañana cambia el precio de
 * lista, los procederes ya registrados no se recalculan.
 */
export async function registrarProceder(input: {
  fecha: Date;
  clienteId: string;
  enfermeroId: string;
  proceder: string;
  notaGuardiaId?: string | null;
  notas?: string | null;
}) {
  const mes = mesDe(input.fecha);
  const [cfg, planes, cliente, enfermero] = await Promise.all([
    getConfigFacturadores(),
    getPlanesConfig(),
    prisma.cliente.findUniqueOrThrow({ where: { id: input.clienteId } }),
    prisma.profesional.findUniqueOrThrow({ where: { id: input.enfermeroId } }),
  ]);

  if (enfermero.rol !== "ENFERMERO") {
    throw new Error("El profesional seleccionado no es un enfermero");
  }

  const yaHechos = await prisma.procederEjecutado.count({
    where: { clienteId: input.clienteId, mes },
  });
  const numeroDelMes = yaHechos + 1;

  const planCfg = cliente.plan ? planes.find((p) => p.plan === cliente.plan) : null;
  const cupoPlan = planCfg?.cupoProcederesMes ?? 0;
  const dentroDeCupo = numeroDelMes <= cupoPlan;

  const precio = D(cfg.precioProcederSinIva);
  const pct = D(enfermero.pctProceder ?? cfg.pctEnfermero).div(100);

  return prisma.procederEjecutado.create({
    data: {
      fecha: input.fecha,
      mes,
      clienteId: input.clienteId,
      enfermeroId: input.enfermeroId,
      proceder: input.proceder,
      notaGuardiaId: input.notaGuardiaId || null,
      plan: (cliente.plan as PlanContratado) || null,
      numeroDelMes,
      cupoPlan,
      dentroDeCupo,
      montoCliente: dentroDeCupo ? D(0) : precio,
      montoEnfermero: precio.mul(pct),
      notas: input.notas || null,
    },
  });
}

/**
 * Recalcula la numeración y el cupo de todos los procederes de un cliente en
 * un mes. Se usa después de borrar uno, para que la secuencia no quede con
 * huecos y alguien termine facturando de más.
 *
 * OJO con el "congelado": si cambió precioProcederSinIva o el % del enfermero
 * desde que se registraron, esta recalculación usa los valores VIGENTES hoy
 * para las filas que sobreviven (no los de cuando se registraron). Se recalculan
 * montoCliente y montoEnfermero juntos, con la misma base de precio, para que
 * nunca queden desalineados entre sí — antes solo se refrescaba montoCliente y
 * montoEnfermero quedaba con el precio viejo.
 */
export async function renumerarProcederes(clienteId: string, mes: string) {
  const [cfg, planes, procederes] = await Promise.all([
    getConfigFacturadores(),
    getPlanesConfig(),
    prisma.procederEjecutado.findMany({
      where: { clienteId, mes },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const enfermeroIds = [...new Set(procederes.map((p) => p.enfermeroId))];
  const enfermeros = await prisma.profesional.findMany({ where: { id: { in: enfermeroIds } } });
  const enfermerosMap = new Map(enfermeros.map((e) => [e.id, e]));

  const precio = D(cfg.precioProcederSinIva);

  await prisma.$transaction(
    procederes.map((p, i) => {
      const planCfg = p.plan ? planes.find((pc) => pc.plan === p.plan) : null;
      const cupoPlan = planCfg?.cupoProcederesMes ?? p.cupoPlan;
      const numeroDelMes = i + 1;
      const dentroDeCupo = numeroDelMes <= cupoPlan;
      const enfermero = enfermerosMap.get(p.enfermeroId);
      const pct = D(enfermero?.pctProceder ?? cfg.pctEnfermero).div(100);
      return prisma.procederEjecutado.update({
        where: { id: p.id },
        data: {
          numeroDelMes,
          cupoPlan,
          dentroDeCupo,
          montoCliente: dentroDeCupo ? D(0) : precio,
          montoEnfermero: precio.mul(pct),
        },
      });
    })
  );
}

/**
 * Calcula (sin persistir) la liquidación de un profesional para un mes.
 * - MEDICO: base por disponibilidad + suma de las notas de guardia con nota
 *   cargada, con tope.
 * - ENFERMERO: suma de lo que se le debe por cada proceder ejecutado. Sin
 *   base ni tope: cobra por trabajo hecho.
 */
export async function calcularLiquidacionFacturador(profesionalId: string, mes: string) {
  const [profesional, cfg] = await Promise.all([
    prisma.profesional.findUniqueOrThrow({ where: { id: profesionalId } }),
    getConfigFacturadores(),
  ]);

  if (profesional.rol === "MEDICO") {
    const notas = await prisma.notaGuardia.findMany({
      where: { medicoId: profesionalId, mes, notaCargada: true },
      select: { montoLiquidado: true, tipo: true },
    });
    const base = D(profesional.baseMensual ?? cfg.baseMensualMedico);
    const variable = notas.reduce((acc, n) => acc.add(n.montoLiquidado), D(0));
    const subtotal = base.add(variable);
    const tope = D(profesional.topeMensual ?? cfg.topeMensualMedico);
    const total = subtotal.greaterThan(tope) ? tope : subtotal;

    const notasSinCargar = await prisma.notaGuardia.count({
      where: { medicoId: profesionalId, mes, notaCargada: false },
    });

    return {
      profesional,
      base,
      variable,
      cantidadEventos: notas.length,
      subtotal,
      tope,
      total,
      topeAplicado: subtotal.greaterThan(tope),
      notasSinCargar,
      desglose: {
        programadas: notas.filter((n) => n.tipo === "PROGRAMADA").length,
        guardia: notas.filter((n) => n.tipo === "GUARDIA").length,
        emergencia: notas.filter((n) => n.tipo === "EMERGENCIA").length,
      },
    };
  }

  const procederes = await prisma.procederEjecutado.findMany({
    where: { enfermeroId: profesionalId, mes },
    select: { montoEnfermero: true, montoCliente: true, dentroDeCupo: true },
  });
  const variable = procederes.reduce((acc, p) => acc.add(p.montoEnfermero), D(0));
  const facturadoAClientes = procederes.reduce((acc, p) => acc.add(p.montoCliente), D(0));

  return {
    profesional,
    base: D(0),
    variable,
    cantidadEventos: procederes.length,
    subtotal: variable,
    tope: null as Prisma.Decimal | null,
    total: variable,
    topeAplicado: false,
    notasSinCargar: 0,
    desglose: {
      dentroDeCupo: procederes.filter((p) => p.dentroDeCupo).length,
      fueraDeCupo: procederes.filter((p) => !p.dentroDeCupo).length,
      facturadoAClientes,
      margenVivam: facturadoAClientes.sub(variable),
    },
  };
}

/** Cierra el mes de un facturador. Idempotente por profesional+mes. */
export async function procesarLiquidacionFacturador(profesionalId: string, mes: string) {
  const existe = await prisma.liquidacionFacturador.findUnique({
    where: { profesionalId_mes: { profesionalId, mes } },
  });
  if (existe) return existe;

  const c = await calcularLiquidacionFacturador(profesionalId, mes);
  return prisma.liquidacionFacturador.create({
    data: {
      profesionalId,
      mes,
      base: c.base,
      variable: c.variable,
      cantidadEventos: c.cantidadEventos,
      subtotal: c.subtotal,
      tope: c.tope,
      total: c.total,
    },
  });
}

/**
 * Resumen del mes para el panel: costo total del módulo y alertas.
 *
 * Si quien llama ya calculó la liquidación de cada profesional activo (ej. la
 * ruta de liquidacion-facturadores), se la puede pasar en calculosPrevios para
 * no recalcularla de nuevo acá — evita repetir las mismas queries dos veces
 * por request.
 */
export async function resumenFacturadoresMes(
  mes: string,
  calculosPrevios?: Awaited<ReturnType<typeof calcularLiquidacionFacturador>>[]
) {
  const calculos =
    calculosPrevios ??
    (await Promise.all(
      (await prisma.profesional.findMany({ where: { estado: "ACTIVO" } })).map((p) =>
        calcularLiquidacionFacturador(p.id, mes)
      )
    ));

  const costoMedicos = calculos
    .filter((c) => c.profesional.rol === "MEDICO")
    .reduce((acc, c) => acc.add(c.total), D(0));
  const costoEnfermeros = calculos
    .filter((c) => c.profesional.rol === "ENFERMERO")
    .reduce((acc, c) => acc.add(c.total), D(0));

  const procederes = await prisma.procederEjecutado.findMany({
    where: { mes },
    select: { montoCliente: true, montoEnfermero: true },
  });
  const facturadoProcederes = procederes.reduce((acc, p) => acc.add(p.montoCliente), D(0));
  const pagadoProcederes = procederes.reduce((acc, p) => acc.add(p.montoEnfermero), D(0));

  const notasSinCargar = await prisma.notaGuardia.count({ where: { mes, notaCargada: false } });
  const sinBackup = await prisma.turnoGuardia.count({ where: { mes, medicoBackupId: null } });
  const seguroVencido = await prisma.profesional.count({
    where: { estado: "ACTIVO", OR: [{ seguroRcVence: null }, { seguroRcVence: { lt: new Date() } }] },
  });

  return {
    costoMedicos,
    costoEnfermeros,
    costoTotal: costoMedicos.add(costoEnfermeros),
    facturadoProcederes,
    pagadoProcederes,
    // Negativo es lo esperable al principio: el cupo incluido es costo de adquisición.
    margenProcederes: facturadoProcederes.sub(pagadoProcederes),
    alertas: { notasSinCargar, sinBackup, seguroVencido },
  };
}
