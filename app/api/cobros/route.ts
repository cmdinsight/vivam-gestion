import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonth } from "@/lib/format";

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
// todavía no tengan un cobro cargado para ese mes.
export async function POST(req: NextRequest) {
  const { mes } = await req.json();
  const targetMes = mes || currentMonth();
  const [y, m] = targetMes.split("-").map(Number);

  const clientes = await prisma.cliente.findMany({ where: { estado: "ACTIVO" } });
  const existentes = await prisma.cobro.findMany({ where: { mes: targetMes } });
  const yaExisten = new Set(existentes.map((c) => c.clienteId));

  const nuevos = clientes.filter((c) => !yaExisten.has(c.id));
  if (nuevos.length > 0) {
    await prisma.cobro.createMany({
      data: nuevos.map((c) => ({
        clienteId: c.id,
        mes: targetMes,
        montoEsperado: c.precioMensual,
        fechaVencimiento: new Date(y, m - 1, 10),
        estado: "PENDIENTE" as const,
      })),
    });
  }

  const cobros = await prisma.cobro.findMany({
    where: { mes: targetMes },
    include: { cliente: true },
    orderBy: { fechaVencimiento: "asc" },
  });
  return NextResponse.json(cobros);
}
