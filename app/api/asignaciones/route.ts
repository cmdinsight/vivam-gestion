import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarTurnosParaAsignacion } from "@/lib/turnos";
import { currentMonth, shiftMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("clienteId") || undefined;
  const trabajadorId = req.nextUrl.searchParams.get("trabajadorId") || undefined;
  const asignaciones = await prisma.asignacionFija.findMany({
    where: { clienteId, trabajadorId },
    include: { trabajador: true, cliente: true },
    orderBy: { fechaInicio: "desc" },
  });
  return NextResponse.json(asignaciones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const asignacion = await prisma.asignacionFija.create({
    data: {
      clienteId: body.clienteId,
      trabajadorId: body.trabajadorId,
      diasSemana: body.diasSemana,
      horaInicio: body.horaInicio,
      horaFin: body.horaFin,
      fechaInicio: new Date(body.fechaInicio),
      fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
      notas: body.notas || null,
    },
  });

  // Genera de una el mes en curso y los dos siguientes.
  const meses = [currentMonth(), shiftMonth(currentMonth(), 1), shiftMonth(currentMonth(), 2)];
  for (const mes of meses) {
    await generarTurnosParaAsignacion(asignacion.id, mes);
  }

  return NextResponse.json(asignacion, { status: 201 });
}
