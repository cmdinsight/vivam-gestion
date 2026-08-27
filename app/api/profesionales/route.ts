import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rol = req.nextUrl.searchParams.get("rol");
  const profesionales = await prisma.profesional.findMany({
    where: rol ? { rol: rol as "MEDICO" | "ENFERMERO" } : undefined,
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    omit: { passwordHash: true },
  });
  return NextResponse.json(profesionales);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const profesional = await prisma.profesional.create({
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
      estado: body.estado || "ACTIVO",
      notas: body.notas || null,
    },
  });
  return NextResponse.json(profesional, { status: 201 });
}
