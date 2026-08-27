import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const profesional = await prisma.profesional.findUnique({
    where: { id: params.id },
    omit: { passwordHash: true },
  });
  if (!profesional) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(profesional);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const profesional = await prisma.profesional.update({
    where: { id: params.id },
    omit: { passwordHash: true },
    data: {
      nombre: body.nombre,
      rol: body.rol,
      especialidad: body.especialidad || null,
      contacto: body.contacto || null,
      cajaProfesional: body.cajaProfesional || null,
      rutMonotributo: body.rutMonotributo || null,
      seguroRcVence: body.seguroRcVence ? new Date(body.seguroRcVence) : null,
      cuentaBancaria: body.cuentaBancaria || null,
      baseMensual: body.baseMensual === "" || body.baseMensual == null ? null : body.baseMensual,
      topeMensual: body.topeMensual === "" || body.topeMensual == null ? null : body.topeMensual,
      pctProceder: body.pctProceder === "" || body.pctProceder == null ? null : body.pctProceder,
      zonas: body.zonas || null,
      estado: body.estado,
      notas: body.notas || null,
    },
  });
  return NextResponse.json(profesional);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.profesional.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
