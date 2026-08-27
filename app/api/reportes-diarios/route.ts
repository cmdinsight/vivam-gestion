import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("clienteId") || undefined;
  const mes = req.nextUrl.searchParams.get("mes") || undefined;
  const reportes = await prisma.reporteDiario.findMany({
    where: { clienteId, mes },
    orderBy: { fecha: "desc" },
    include: { trabajador: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json(reportes);
}
