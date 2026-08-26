import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asegurarTurnosDelMes, calcularHoras } from "@/lib/turnos";
import { currentMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes") || currentMonth();
  const trabajadorId = req.nextUrl.searchParams.get("trabajadorId") || undefined;
  const clienteId = req.nextUrl.searchParams.get("clienteId") || undefined;

  await asegurarTurnosDelMes(mes);

  const turnos = await prisma.turno.findMany({
    where: { mes, trabajadorId, clienteId },
    include: { cliente: true, trabajador: true },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
  });
  return NextResponse.json(turnos);
}

// Turno manual: cobertura extra puntual fuera de una asignación fija.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const fecha = new Date(body.fecha);
  const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;

  const procesado = await prisma.liquidacionMensual.findUnique({
    where: { trabajadorId_mes: { trabajadorId: body.trabajadorId, mes } },
  });
  if (procesado) {
    return NextResponse.json(
      { error: `El mes ${mes} ya fue procesado para este cuidador; no se pueden agregar más turnos.` },
      { status: 409 }
    );
  }

  const turno = await prisma.turno.create({
    data: {
      trabajadorId: body.trabajadorId,
      clienteId: body.clienteId || null,
      fecha,
      mes,
      horaInicio: body.horaInicio,
      horaFin: body.horaFin,
      horas: calcularHoras(body.horaInicio, body.horaFin),
      estado: body.estado || "PROGRAMADO",
      motivo: body.motivo || null,
      origenManual: true,
    },
  });
  return NextResponse.json(turno, { status: 201 });
}
