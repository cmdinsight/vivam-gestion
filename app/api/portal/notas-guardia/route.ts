import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { montoDeNota, mesDe } from "@/lib/facturadores";
import { requireProfesionalSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireProfesionalSession();
  if (!session || session.profesionalRol !== "MEDICO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const mes = req.nextUrl.searchParams.get("mes") || undefined;
  const notas = await prisma.notaGuardia.findMany({
    where: { medicoId: session.profesionalId, mes },
    orderBy: { fecha: "desc" },
    include: { cliente: { select: { id: true, nombrePaciente: true } } },
  });
  return NextResponse.json(notas);
}

export async function POST(req: NextRequest) {
  const session = await requireProfesionalSession();
  if (!session || session.profesionalRol !== "MEDICO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json();
  const fecha = new Date(body.fecha);
  const notaCargada = !!body.notaCargada;
  const monto = await montoDeNota(body.tipo, notaCargada);

  const nota = await prisma.notaGuardia.create({
    data: {
      fecha,
      mes: mesDe(fecha),
      medicoId: session.profesionalId,
      clienteId: body.clienteId || null,
      quienLlama: body.quienLlama,
      tipo: body.tipo,
      motivo: body.motivo,
      datosObjetivos: body.datosObjetivos || null,
      valoracion: body.valoracion || null,
      conducta: body.conducta || null,
      signosAlarma: body.signosAlarma || null,
      derivoEmergencia: !!body.derivoEmergencia,
      avisoFamilia: !!body.avisoFamilia,
      notaCargada,
      cargadaEn: notaCargada ? new Date() : null,
      montoLiquidado: monto,
    },
  });
  return NextResponse.json(nota, { status: 201 });
}
