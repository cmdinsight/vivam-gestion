import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfiguracion } from "@/lib/payroll";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await getConfiguracion();
  return NextResponse.json(cfg);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const data = {
    bpsPatronalPct: body.bpsPatronalPct,
    bsePct: body.bsePct,
    aguinaldoDivisor: body.aguinaldoDivisor,
    licenciaDiasAnio: body.licenciaDiasAnio,
    licenciaPct: body.licenciaPct,
    tarifaHoraDiurna: body.tarifaHoraDiurna,
    tarifaHoraNocturna: body.tarifaHoraNocturna,
    tarifaHoraClienteDiurna: body.tarifaHoraClienteDiurna,
    tarifaHoraClienteNocturna: body.tarifaHoraClienteNocturna,
  };
  const cfg = await prisma.configuracion.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  return NextResponse.json(cfg);
}
