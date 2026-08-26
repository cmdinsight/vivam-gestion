import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularHoras } from "@/lib/turnos";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const horaInicio = body.horaInicio;
  const horaFin = body.horaFin;

  const turno = await prisma.turno.update({
    where: { id: params.id },
    data: {
      horaInicio,
      horaFin,
      horas: calcularHoras(horaInicio, horaFin),
      estado: body.estado,
      motivo: body.motivo || null,
      editado: true,
    },
  });
  return NextResponse.json(turno);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.turno.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
