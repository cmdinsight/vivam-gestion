import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarProceder } from "@/lib/facturadores";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes") || undefined;
  const clienteId = req.nextUrl.searchParams.get("clienteId") || undefined;
  const procederes = await prisma.procederEjecutado.findMany({
    where: { mes, clienteId },
    orderBy: { fecha: "desc" },
    include: {
      enfermero: { select: { id: true, nombre: true } },
      cliente: { select: { id: true, nombrePaciente: true, plan: true } },
    },
  });
  return NextResponse.json(procederes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const proceder = await registrarProceder({
      fecha: new Date(body.fecha),
      clienteId: body.clienteId,
      enfermeroId: body.enfermeroId,
      proceder: body.proceder,
      notaGuardiaId: body.notaGuardiaId || null,
      notas: body.notas || null,
    });
    return NextResponse.json(proceder, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al registrar el proceder";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
