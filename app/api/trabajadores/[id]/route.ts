import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const trabajador = await prisma.trabajador.findUnique({ where: { id: params.id } });
  if (!trabajador) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(trabajador);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const trabajador = await prisma.trabajador.update({
    where: { id: params.id },
    data: {
      nombre: body.nombre,
      contacto: body.contacto || null,
      fechaIngreso: new Date(body.fechaIngreso),
      categoriaLaboral: body.categoriaLaboral || null,
      tipoTarifa: body.tipoTarifa,
      tarifa: body.tarifa,
      cuentaBancaria: body.cuentaBancaria || null,
      diasLicenciaAnualesOverride: body.diasLicenciaAnualesOverride || null,
      proximaFechaLicenciaEstimada: body.proximaFechaLicenciaEstimada
        ? new Date(body.proximaFechaLicenciaEstimada)
        : null,
      estado: body.estado,
      notas: body.notas || null,
    },
  });
  return NextResponse.json(trabajador);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.trabajador.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
