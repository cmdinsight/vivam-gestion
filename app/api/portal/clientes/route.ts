import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProfesionalSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireProfesionalSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const clientes = await prisma.cliente.findMany({
    where: { estado: "ACTIVO" },
    select: { id: true, nombrePaciente: true },
    orderBy: { nombrePaciente: "asc" },
  });
  return NextResponse.json(clientes);
}
