import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularLiquidacionFacturador } from "@/lib/facturadores";
import { currentMonth } from "@/lib/format";
import { requireProfesionalSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireProfesionalSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const mes = req.nextUrl.searchParams.get("mes") || currentMonth();
  const [calculo, cerrada] = await Promise.all([
    calcularLiquidacionFacturador(session.profesionalId, mes),
    prisma.liquidacionFacturador.findUnique({
      where: { profesionalId_mes: { profesionalId: session.profesionalId, mes } },
    }),
  ]);
  return NextResponse.json({ calculo, cerrada });
}
