import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCuidadorSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

function mesDe(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await requireCuidadorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const mes = req.nextUrl.searchParams.get("mes") || undefined;
  const reportes = await prisma.reporteDiario.findMany({
    where: { trabajadorId: session.trabajadorId, mes },
    orderBy: { fecha: "desc" },
    include: { cliente: { select: { id: true, nombrePaciente: true } } },
  });
  return NextResponse.json(reportes);
}

// Un reporte por cuidador+cliente+dia: si ya cargó uno hoy para ese paciente
// y lo vuelve a enviar, se actualiza en vez de duplicar.
export async function POST(req: NextRequest) {
  const session = await requireCuidadorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  if (!body.clienteId || !body.fecha) {
    return NextResponse.json({ error: "Falta el paciente o la fecha" }, { status: 400 });
  }

  const asignado = await prisma.asignacionFija.findFirst({
    where: { trabajadorId: session.trabajadorId, clienteId: body.clienteId, activa: true },
  });
  if (!asignado) {
    return NextResponse.json({ error: "Ese paciente no está asignado a tu usuario" }, { status: 403 });
  }

  const fecha = new Date(body.fecha);
  const data = {
    estadoGeneral: body.estadoGeneral || null,
    animo: body.animo || null,
    alimentacion: body.alimentacion || null,
    medicacionAdministrada: body.medicacionAdministrada || null,
    movilidad: body.movilidad || null,
    higiene: body.higiene || null,
    observaciones: body.observaciones || null,
  };

  const reporte = await prisma.reporteDiario.upsert({
    where: {
      clienteId_trabajadorId_fecha: { clienteId: body.clienteId, trabajadorId: session.trabajadorId, fecha },
    },
    create: {
      clienteId: body.clienteId,
      trabajadorId: session.trabajadorId,
      fecha,
      mes: mesDe(fecha),
      ...data,
    },
    update: data,
  });
  return NextResponse.json(reporte, { status: 201 });
}
