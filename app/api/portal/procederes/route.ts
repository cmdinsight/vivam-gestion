import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarProceder } from "@/lib/facturadores";
import { requireProfesionalSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireProfesionalSession();
  if (!session || session.profesionalRol !== "ENFERMERO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const mes = req.nextUrl.searchParams.get("mes") || undefined;
  const procederes = await prisma.procederEjecutado.findMany({
    where: { enfermeroId: session.profesionalId, mes },
    orderBy: { fecha: "desc" },
    include: { cliente: { select: { id: true, nombrePaciente: true } } },
  });
  return NextResponse.json(procederes);
}

export async function POST(req: NextRequest) {
  const session = await requireProfesionalSession();
  if (!session || session.profesionalRol !== "ENFERMERO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json();
  try {
    const proceder = await registrarProceder({
      fecha: new Date(body.fecha),
      clienteId: body.clienteId,
      enfermeroId: session.profesionalId,
      proceder: body.proceder,
      notas: body.notas || null,
    });
    return NextResponse.json(proceder, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al registrar el proceder";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
