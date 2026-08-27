import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularMes } from "@/lib/payroll";
import { alertasHuecoCobertura, asegurarTurnosDelMes } from "@/lib/turnos";
import { resumenFacturadoresMes } from "@/lib/facturadores";
import { currentMonth } from "@/lib/format";
import { Prisma } from "@prisma/client";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes") || currentMonth();
  const [y, m] = mes.split("-").map(Number);
  const inicioMes = new Date(y, m - 1, 1);
  const finMes = new Date(y, m, 1);

  const trabajadoresActivos = await prisma.trabajador.findMany({ where: { estado: "ACTIVO" } });

  let sueldos = D(0);
  let cargas = D(0);
  let provisionAguinaldoMes = D(0);
  let provisionLicenciaMes = D(0);

  for (const t of trabajadoresActivos) {
    const calc = await calcularMes(t.id, mes);
    sueldos = sueldos.add(calc.sueldoNominal);
    cargas = cargas.add(calc.cargasCorrientes);
    provisionAguinaldoMes = provisionAguinaldoMes.add(calc.aguinaldoProvision);
    provisionLicenciaMes = provisionLicenciaMes.add(calc.licenciaProvision);
  }

  const pagosDelMes = await prisma.movimientoProvision.aggregate({
    where: { esPago: true, fecha: { gte: inicioMes, lt: finMes } },
    _sum: { monto: true },
  });
  const pagosMonto = (pagosDelMes._sum.monto ?? D(0)).neg(); // los pagos se guardan negativos

  const cajaNecesaria = sueldos.add(cargas).add(pagosMonto);
  const costoRealTotal = sueldos.add(cargas).add(provisionAguinaldoMes).add(provisionLicenciaMes);

  const fondoReservaAgg = await prisma.movimientoProvision.aggregate({ _sum: { monto: true } });
  const fondoReserva = fondoReservaAgg._sum.monto ?? D(0);

  const cobrosMes = await prisma.cobro.findMany({ where: { mes } });
  const totalEsperado = cobrosMes.reduce((acc, c) => acc.add(c.montoEsperado), D(0));
  const totalCobrado = cobrosMes.reduce(
    (acc, c) => (c.estado === "COBRADO" ? acc.add(c.montoCobrado ?? c.montoEsperado) : acc),
    D(0)
  );
  const totalAtrasado = cobrosMes
    .filter((c) => c.estado !== "COBRADO")
    .reduce((acc, c) => acc.add(c.montoEsperado), D(0));
  const pctAtraso = totalEsperado.gt(0) ? totalAtrasado.div(totalEsperado).mul(100) : D(0);

  // Rentabilidad de la empresa: además del costo de cuidadores (con provisión),
  // suma lo que se liquida a médicos y enfermeros facturadores. Antes el
  // "margen real" solo restaba cuidadores y sobreestimaba la rentabilidad.
  const facturadores = await resumenFacturadoresMes(mes);
  const costoCuidadores = costoRealTotal;
  const costoFacturadores = facturadores.costoTotal;
  const costoTotalEmpresa = costoCuidadores.add(costoFacturadores);
  const margenReal = totalEsperado.sub(costoTotalEmpresa);
  const pctMargen = totalEsperado.gt(0) ? margenReal.div(totalEsperado).mul(100) : D(0);

  // Clientes con cobro generado ESE mes, no el conteo de activos de hoy: si no,
  // al navegar a un mes pasado con otra cantidad de clientes, los promedios de
  // ingreso/costo por cliente quedarían divididos por el número de hoy.
  const clientesActivos = cobrosMes.length;
  const ingresoPromedioCliente = clientesActivos > 0 ? totalEsperado.div(clientesActivos) : D(0);
  const costoPromedioCliente = clientesActivos > 0 ? costoTotalEmpresa.div(clientesActivos) : D(0);
  const pctCostoCuidadores = totalEsperado.gt(0) ? costoCuidadores.div(totalEsperado).mul(100) : D(0);
  const pctCostoFacturadores = totalEsperado.gt(0) ? costoFacturadores.div(totalEsperado).mul(100) : D(0);

  // Alertas
  const alertas: { tipo: string; mensaje: string }[] = [];
  if (facturadores.alertas.notasSinCargar > 0) {
    alertas.push({
      tipo: "notaGuardia",
      mensaje: `Hay ${facturadores.alertas.notasSinCargar} nota${facturadores.alertas.notasSinCargar === 1 ? "" : "s"} de guardia sin cargar este mes: esas llamadas no se le liquidan al médico.`,
    });
  }
  if (facturadores.alertas.sinBackup > 0) {
    alertas.push({
      tipo: "guardiaSinBackup",
      mensaje: `Hay ${facturadores.alertas.sinBackup} bloque${facturadores.alertas.sinBackup === 1 ? "" : "s"} de guardia médica sin médico backup asignado este mes.`,
    });
  }
  if (facturadores.alertas.seguroVencido > 0) {
    alertas.push({
      tipo: "seguroVencido",
      mensaje: `${facturadores.alertas.seguroVencido} profesional${facturadores.alertas.seguroVencido === 1 ? "" : "es"} facturador${facturadores.alertas.seguroVencido === 1 ? "" : "es"} activo${facturadores.alertas.seguroVencido === 1 ? "" : "s"} con el seguro de responsabilidad civil vencido o sin cargar.`,
    });
  }
  const hoy = new Date();
  const proxJunio = new Date(hoy.getFullYear(), 5, 30);
  const proxDiciembre = new Date(hoy.getFullYear(), 11, 30);
  for (const fecha of [proxJunio, proxDiciembre]) {
    const dias = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (dias >= 0 && dias <= 30) {
      alertas.push({
        tipo: "aguinaldo",
        mensaje: `El pago de aguinaldo vence el ${fecha.toLocaleDateString("es-UY")} (en ${dias} día${dias === 1 ? "" : "s"}). Fondo de aguinaldo acumulado disponible para verificar en cada cuidador.`,
      });
    }
  }

  const trabajadoresConLicencia = await prisma.trabajador.findMany({
    where: { estado: "ACTIVO", proximaFechaLicenciaEstimada: { not: null } },
  });
  for (const t of trabajadoresConLicencia) {
    if (!t.proximaFechaLicenciaEstimada) continue;
    const dias = Math.ceil(
      (t.proximaFechaLicenciaEstimada.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dias >= 0 && dias <= 30) {
      alertas.push({
        tipo: "licencia",
        mensaje: `${t.nombre} tiene licencia estimada el ${t.proximaFechaLicenciaEstimada.toLocaleDateString("es-UY")} (en ${dias} día${dias === 1 ? "" : "s"}).`,
      });
    }
  }

  await asegurarTurnosDelMes(currentMonth());
  alertas.push(...(await alertasHuecoCobertura()));

  return NextResponse.json({
    mes,
    sueldos,
    cargas,
    provisionAguinaldoMes,
    provisionLicenciaMes,
    pagosMonto,
    cajaNecesaria,
    costoRealTotal,
    fondoReserva,
    totalEsperado,
    totalCobrado,
    totalAtrasado,
    pctAtraso,
    margenReal,
    pctMargen,
    costoCuidadores,
    costoFacturadores,
    costoTotalEmpresa,
    clientesActivos,
    ingresoPromedioCliente,
    costoPromedioCliente,
    pctCostoCuidadores,
    pctCostoFacturadores,
    alertas,
    cantidadTrabajadoresActivos: trabajadoresActivos.length,
    cantidadClientesConCobro: cobrosMes.length,
  });
}
