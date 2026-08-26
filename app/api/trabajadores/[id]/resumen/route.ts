import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularMes, saldoProvision } from "@/lib/payroll";
import { asegurarTurnosDelMes } from "@/lib/turnos";
import { currentMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const mes = req.nextUrl.searchParams.get("mes") || currentMonth();
  const trabajadorId = params.id;

  await asegurarTurnosDelMes(mes);

  const [calc, liquidacion, turnos, saldoAguinaldo, saldoLicencia, movimientos] = await Promise.all([
    calcularMes(trabajadorId, mes),
    prisma.liquidacionMensual.findUnique({ where: { trabajadorId_mes: { trabajadorId, mes } } }),
    prisma.turno.findMany({
      where: { trabajadorId, mes },
      include: { cliente: true },
      orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
    }),
    saldoProvision(trabajadorId, "AGUINALDO"),
    saldoProvision(trabajadorId, "LICENCIA"),
    prisma.movimientoProvision.findMany({ where: { trabajadorId }, orderBy: { fecha: "desc" }, take: 24 }),
  ]);

  return NextResponse.json({
    calculo: {
      horasTotales: calc.horasTotales,
      sueldoNominal: calc.sueldoNominal,
      bpsPatronal: calc.bpsPatronal,
      bse: calc.bse,
      aguinaldoProvision: calc.aguinaldoProvision,
      licenciaProvision: calc.licenciaProvision,
      cargasCorrientes: calc.cargasCorrientes,
      costoTotalMes: calc.costoTotalMes,
    },
    procesado: !!liquidacion,
    turnos,
    saldoAguinaldo,
    saldoLicencia,
    movimientos,
  });
}
