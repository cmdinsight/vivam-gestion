import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { datosValoracion, medicamentosValidos } from "@/lib/valoracion";
import { requireProfesionalSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireProfesionalSession();
  if (!session || session.profesionalRol !== "MEDICO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const clienteId = req.nextUrl.searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "Falta clienteId" }, { status: 400 });

  const valoracion = await prisma.valoracionInicial.findUnique({
    where: { clienteId },
    include: { medicamentos: true },
  });
  return NextResponse.json(valoracion);
}

// La valoración es la ficha médica del cliente, no una nota personal del
// médico que la carga: cualquier médico activo puede crearla o corregirla
// (por eso no se restringe a "solo quien la creó"), pero solo un médico
// puede hacerlo — un enfermero no.
export async function POST(req: NextRequest) {
  const session = await requireProfesionalSession();
  if (!session || session.profesionalRol !== "MEDICO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.clienteId) {
    return NextResponse.json({ error: "Falta el paciente" }, { status: 400 });
  }

  const medicamentos = medicamentosValidos(body);
  const data = {
    ...datosValoracion(body),
    medicoId: session.profesionalId,
    fecha: body.fecha ? new Date(body.fecha) : new Date(),
  };

  const valoracion = await prisma.$transaction(async (tx) => {
    const v = await tx.valoracionInicial.upsert({
      where: { clienteId: body.clienteId },
      create: { clienteId: body.clienteId, ...data },
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
      include: { medicamentos: true },
    });
  });

  return NextResponse.json(valoracion, { status: 201 });
}
