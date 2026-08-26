import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes") || undefined;
  const turnos = await prisma.turnoGuardia.findMany({
    where: { mes },
    orderBy: [{ mes: "desc" }, { bloque: "asc" }],
    include: {
      medicoTitular: { select: { id: true, nombre: true } },
      medicoBackup: { select: { id: true, nombre: true } },
    },
  });
  return NextResponse.json(turnos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const turno = await prisma.turnoGuardia.upsert({
    where: { mes_bloque: { mes: body.mes, bloque: body.bloque } },
    create: {
      mes: body.mes,
      bloque: body.bloque,
      medicoTitularId: body.medicoTitularId,
      medicoBackupId: body.medicoBackupId || null,
      franjaHoraria: body.franjaHoraria || "24/7",
      notas: body.notas || null,
    },
    update: {
      medicoTitularId: body.medicoTitularId,
      medicoBackupId: body.medicoBackupId || null,
      franjaHoraria: body.franjaHoraria || "24/7",
      notas: body.notas || null,
    },
  });
  return NextResponse.json(turno, { status: 201 });
}
