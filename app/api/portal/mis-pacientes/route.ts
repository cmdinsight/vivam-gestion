import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCuidadorSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

// A diferencia de /api/portal/clientes (para profesionales, que hoy no tienen
// un concepto de "paciente asignado"), un cuidador sí tiene asignaciones
// reales en AsignacionFija — el selector del reporte diario se limita a esos
// clientes, no a la lista completa.
export async function GET() {
  const session = await requireCuidadorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const asignaciones = await prisma.asignacionFija.findMany({
    where: { trabajadorId: session.trabajadorId, activa: true },
    select: { cliente: { select: { id: true, nombrePaciente: true, estado: true } } },
    distinct: ["clienteId"],
  });

  const clientes = asignaciones
    .map((a) => a.cliente)
    .filter((c) => c.estado === "ACTIVO")
    .sort((a, b) => a.nombrePaciente.localeCompare(b.nombrePaciente));

  return NextResponse.json(clientes);
}
