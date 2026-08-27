import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// De lectura para cualquier profesional o cuidador logueado: la ficha médica
// es del paciente, no de quien la cargó, así que todo el equipo que lo
// atiende necesita poder verla (esto es justamente lo que pidió el negocio:
// que médicos, enfermeros y cuidadores tengan acceso a esta información).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.rol !== "PROFESIONAL" && session.rol !== "CUIDADOR")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const clienteId = req.nextUrl.searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "Falta clienteId" }, { status: 400 });

  const valoracion = await prisma.valoracionInicial.findUnique({
    where: { clienteId },
    include: { medicamentos: true, medico: { select: { nombre: true } } },
  });
  return NextResponse.json(valoracion);
}
