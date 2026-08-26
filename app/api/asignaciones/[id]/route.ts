import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarTurnosParaAsignacion } from "@/lib/turnos";
import { currentMonth, shiftMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

// La edición de una asignación solo afecta la generación futura de turnos;
// los turnos ya generados o editados no se tocan retroactivamente.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const asignacion = await prisma.asignacionFija.update({
    where: { id: params.id },
    data: {
      diasSemana: body.diasSemana,
      horaInicio: body.horaInicio,
      horaFin: body.horaFin,
      fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
      activa: body.activa,
      notas: body.notas || null,
    },
  });

  if (asignacion.activa) {
    const meses = [currentMonth(), shiftMonth(currentMonth(), 1), shiftMonth(currentMonth(), 2)];
    for (const mes of meses) {
      await generarTurnosParaAsignacion(asignacion.id, mes);
    }
  }

  return NextResponse.json(asignacion);
}

// "Finalizar" una asignación: se marca inactiva con fecha de fin, no se borra
// (los turnos ya generados quedan como historial).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const asignacion = await prisma.asignacionFija.update({
    where: { id: params.id },
    data: { activa: false, fechaFin: new Date() },
  });
  return NextResponse.json(asignacion);
}
