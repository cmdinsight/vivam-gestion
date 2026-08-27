import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calcularLiquidacionFacturador,
  procesarLiquidacionFacturador,
  resumenFacturadoresMes,
} from "@/lib/facturadores";

export const dynamic = "force-dynamic";

/** GET ?mes=YYYY-MM → cálculo en vivo de todos los facturadores activos + resumen. */
export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes");
  if (!mes) return NextResponse.json({ error: "Falta mes" }, { status: 400 });

  const profesionales = await prisma.profesional.findMany({
    where: { estado: "ACTIVO" },
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
  });

  const [calculos, cerradas] = await Promise.all([
    Promise.all(profesionales.map((p) => calcularLiquidacionFacturador(p.id, mes))),
    prisma.liquidacionFacturador.findMany({ where: { mes } }),
  ]);
  const resumen = await resumenFacturadoresMes(mes, calculos);
  const cerradasMap = new Map(cerradas.map((c) => [c.profesionalId, c]));

  return NextResponse.json({
    mes,
    resumen,
    lineas: calculos.map((c) => ({
      profesionalId: c.profesional.id,
      nombre: c.profesional.nombre,
      rol: c.profesional.rol,
      base: c.base,
      variable: c.variable,
      cantidadEventos: c.cantidadEventos,
      subtotal: c.subtotal,
      tope: c.tope,
      total: c.total,
      topeAplicado: c.topeAplicado,
      notasSinCargar: c.notasSinCargar,
      desglose: c.desglose,
      cerrada: cerradasMap.get(c.profesional.id) ?? null,
    })),
  });
}

/** POST { profesionalId, mes } → cierra el mes de ese facturador. */
export async function POST(req: NextRequest) {
  const { profesionalId, mes } = await req.json();
  if (!profesionalId || !mes) {
    return NextResponse.json({ error: "Falta profesionalId o mes" }, { status: 400 });
  }
  const liq = await procesarLiquidacionFacturador(profesionalId, mes);
  return NextResponse.json(liq, { status: 201 });
}

/** PATCH { liquidacionId, pagado } → marca como pagada. */
export async function PATCH(req: NextRequest) {
  const { liquidacionId, pagado } = await req.json();
  const liq = await prisma.liquidacionFacturador.update({
    where: { id: liquidacionId },
    data: { pagado: !!pagado, fechaPago: pagado ? new Date() : null },
  });
  return NextResponse.json(liq);
}
