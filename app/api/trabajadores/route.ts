import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const trabajadores = await prisma.trabajador.findMany({
    orderBy: { createdAt: "desc" },
    include: { acceso: { select: { usuario: true } } },
  });
  return NextResponse.json(trabajadores);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const trabajador = await prisma.trabajador.create({
    data: {
      nombre: body.nombre,
      contacto: body.contacto || null,
      fechaIngreso: new Date(body.fechaIngreso),
      categoriaLaboral: body.categoriaLaboral || null,
      tipoTarifa: body.tipoTarifa,
      tarifa: body.tarifa,
      cuentaBancaria: body.cuentaBancaria || null,
      diasLicenciaAnualesOverride: body.diasLicenciaAnualesOverride || null,
      estado: body.estado || "ACTIVO",
      notas: body.notas || null,
    },
  });
  return NextResponse.json(trabajador, { status: 201 });
}
