import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonth } from "@/lib/format";
import { calcularMontoPorHora } from "@/lib/planes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes") || currentMonth();
  const cobros = await prisma.cobro.findMany({
    where: { mes },
    include: { cliente: true },
    orderBy: { fechaVencimiento: "asc" },
  });
  return NextResponse.json(cobros);
}

// Genera los cobros pendientes del mes para todos los clientes activos que
// todavía no tengan un cobro cargado para ese mes. Para clientes facturados
// "por hora" (sin plan), además recalcula el monto de los cobros PENDIENTE ya
// existentes a partir de sus turnos reales del mes (los ya cobrados/atrasados
// quedan fijos).
export async function POST(req: NextRequest) {
  const { mes } = await req.json();
  const targetMes = mes || currentMonth();
  const [y, m] = targetMes.split("-").map(Number);

  const clientes = await prisma.cliente.findMany({ where: { estado: "ACTIVO" } });
  const existentes = await prisma.cobro.findMany({ where: { mes: targetMes } });
  const existentesMap = new Map(existentes.map((c) => [c.clienteId, c]));

  const nuevos = clientes.filter((c) => !existentesMap.has(c.id));
  if (nuevos.length > 0) {
    const data = await Promise.all(
      nuevos.map(async (c) => ({
        clienteId: c.id,
        mes: targetMes,
        montoEsperado: c.facturacion === "POR_HORA" ? (await calcularMontoPorHora(c.id, targetMes)).total : c.precioMensual,
        fechaVencimiento: new Date(y, m - 1, 10),
        estado: "PENDIENTE" as const,
      }))
    );
    await prisma.cobro.createMany({ data });
  }

  const clientesPorHora = new Map(clientes.filter((c) => c.facturacion === "POR_HORA").map((c) => [c.id, c]));
  for (const cobro of existentes) {
    if (cobro.estado !== "PENDIENTE" || !clientesPorHora.has(cobro.clienteId)) continue;
    const { total } = await calcularMontoPorHora(cobro.clienteId, targetMes);
    if (total !== parseFloat(cobro.montoEsperado.toString())) {
      await prisma.cobro.update({ where: { id: cobro.id }, data: { montoEsperado: total } });
    }
  }

  const cobros = await prisma.cobro.findMany({
    where: { mes: targetMes },
    include: { cliente: true },
    orderBy: { fechaVencimiento: "asc" },
  });
  return NextResponse.json(cobros);
}
