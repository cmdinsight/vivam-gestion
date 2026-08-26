import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export const DIAS_SEMANA_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function toMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function calcularHoras(horaInicio: string, horaFin: string): Prisma.Decimal {
  const inicio = toMinutos(horaInicio);
  let fin = toMinutos(horaFin);
  if (fin <= inicio) fin += 24 * 60; // cruza medianoche
  return D(fin - inicio).div(60);
}

// Diurna: 06:00-20:00. Nocturna: 20:00-06:00. Se clasifica el turno entero
// según su hora de inicio (tarifa fija Vivam por turno, no se parte a la mitad).
export function esDiurno(horaInicio: string): boolean {
  const min = toMinutos(horaInicio);
  return min >= toMinutos("06:00") && min < toMinutos("20:00");
}

export function mesDeFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

function finDeMes(mes: string): Date {
  const [y, m] = mes.split("-").map(Number);
  return new Date(y, m, 0); // último día del mes
}

/**
 * Genera los turnos faltantes de una asignación fija desde su fecha de inicio
 * (o desde hoy si ya está en curso) hasta el fin del mes indicado, o hasta su
 * fecha de fin si es anterior. Idempotente: nunca duplica ni pisa un turno
 * que ya exista para esa fecha (generado o editado).
 */
export async function generarTurnosParaAsignacion(asignacionId: string, hastaMes: string) {
  const asignacion = await prisma.asignacionFija.findUniqueOrThrow({ where: { id: asignacionId } });
  if (!asignacion.activa) return;

  const horizonte = asignacion.fechaFin && asignacion.fechaFin < finDeMes(hastaMes) ? asignacion.fechaFin : finDeMes(hastaMes);
  if (horizonte < asignacion.fechaInicio) return;

  const existentes = await prisma.turno.findMany({
    where: { asignacionId },
    select: { fecha: true },
  });
  const fechasExistentes = new Set(existentes.map((t) => t.fecha.toISOString().slice(0, 10)));

  const horas = calcularHoras(asignacion.horaInicio, asignacion.horaFin);
  const nuevos: Prisma.TurnoCreateManyInput[] = [];

  // No se genera retroactivo más allá del inicio del mes en curso, para no
  // pisar meses ya cerrados; si la asignación arrancó después, se respeta esa fecha.
  const inicioMesActual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const inicioReal = asignacion.fechaInicio > inicioMesActual ? asignacion.fechaInicio : inicioMesActual;

  for (let d = new Date(inicioReal); d <= horizonte; d.setDate(d.getDate() + 1)) {
    const fecha = new Date(d);
    fecha.setHours(0, 0, 0, 0);
    if (!asignacion.diasSemana.includes(fecha.getDay())) continue;
    const key = fecha.toISOString().slice(0, 10);
    if (fechasExistentes.has(key)) continue;

    nuevos.push({
      trabajadorId: asignacion.trabajadorId,
      clienteId: asignacion.clienteId,
      asignacionId: asignacion.id,
      fecha,
      mes: mesDeFecha(fecha),
      horaInicio: asignacion.horaInicio,
      horaFin: asignacion.horaFin,
      horas,
      estado: "PROGRAMADO",
    });
  }

  if (nuevos.length > 0) {
    await prisma.turno.createMany({ data: nuevos });
  }
}

/**
 * Asegura que existan los turnos de todas las asignaciones activas que
 * cubren el mes indicado (o meses anteriores no generados todavía). Se llama
 * de forma perezosa cada vez que se consulta el calendario de un mes.
 */
export async function asegurarTurnosDelMes(mes: string) {
  const fin = finDeMes(mes);
  const asignaciones = await prisma.asignacionFija.findMany({
    where: {
      activa: true,
      fechaInicio: { lte: fin },
      OR: [{ fechaFin: null }, { fechaFin: { gte: new Date(mes + "-01") } }],
    },
  });
  for (const a of asignaciones) {
    await generarTurnosParaAsignacion(a.id, mes);
  }
}

export type AlertaCobertura = { tipo: "cobertura"; mensaje: string };

/**
 * Detecta cuidadores activos cuyas horas reales de la semana en curso son
 * menores a las pactadas por sus asignaciones fijas activas — posible hueco
 * de cobertura sin reemplazo asignado.
 */
export async function alertasHuecoCobertura(): Promise<AlertaCobertura[]> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diaSemana = hoy.getDay();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - diaSemana);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);

  const trabajadores = await prisma.trabajador.findMany({
    where: { estado: "ACTIVO" },
    include: {
      asignaciones: {
        where: {
          activa: true,
          fechaInicio: { lte: finSemana },
          OR: [{ fechaFin: null }, { fechaFin: { gte: inicioSemana } }],
        },
      },
    },
  });

  const alertas: AlertaCobertura[] = [];

  for (const t of trabajadores) {
    if (t.asignaciones.length === 0) continue;

    let esperado = D(0);
    for (const a of t.asignaciones) {
      const horasTurno = calcularHoras(a.horaInicio, a.horaFin);
      let dias = 0;
      for (let i = 0; i < 7; i++) {
        const dia = new Date(inicioSemana);
        dia.setDate(inicioSemana.getDate() + i);
        if (dia < a.fechaInicio) continue;
        if (a.fechaFin && dia > a.fechaFin) continue;
        if (a.diasSemana.includes(dia.getDay())) dias++;
      }
      esperado = esperado.add(horasTurno.mul(dias));
    }

    const real = await prisma.turno.aggregate({
      where: {
        trabajadorId: t.id,
        fecha: { gte: inicioSemana, lte: finSemana },
        estado: { not: "NO_TRABAJADO" },
      },
      _sum: { horas: true },
    });
    const horasReales = real._sum.horas ?? D(0);

    if (D(horasReales).lt(esperado)) {
      alertas.push({
        tipo: "cobertura",
        mensaje: `${t.nombre} tiene ${horasReales} h reales esta semana contra ${esperado} h pactadas — posible hueco de cobertura sin reemplazo.`,
      });
    }
  }

  return alertas;
}
