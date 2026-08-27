import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { datosValoracion, medicamentosValidos } from "@/lib/valoracion";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const valoracion = await prisma.valoracionInicial.findUnique({
    where: { clienteId: params.id },
    include: { medicamentos: true, medico: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json(valoracion);
}

// Crea o actualiza la valoración inicial de un cliente. El admin elige a qué
// médico atribuírsela (quien hizo la visita en la realidad), no tiene que ser
// quien está logueado — acá no hay sesión de profesional.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.medicoId) {
    return NextResponse.json({ error: "Falta indicar qué médico hizo la valoración" }, { status: 400 });
  }

  const medicamentos = medicamentosValidos(body);
  const data = {
    ...datosValoracion(body),
    medicoId: body.medicoId,
    fecha: body.fecha ? new Date(body.fecha) : new Date(),
  };

  const valoracion = await prisma.$transaction(async (tx) => {
    const v = await tx.valoracionInicial.upsert({
      where: { clienteId: params.id },
      create: { clienteId: params.id, ...data },
      update: data,
    });
    await tx.medicamentoValoracion.deleteMany({ where: { valoracionId: v.id } });
    if (medicamentos.length > 0) {
      await tx.medicamentoValoracion.createMany({
        data: medicamentos.map((m) => ({ ...m, valoracionId: v.id })),
      });
    }
    return tx.valoracionInicial.findUniqueOrThrow({
      where: { id: v.id },
      include: { medicamentos: true, medico: { select: { id: true, nombre: true } } },
    });
  });

  return NextResponse.json(valoracion);
}
