import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfigFacturadores } from "@/lib/facturadores";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await getConfigFacturadores();
  return NextResponse.json(cfg);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  await getConfigFacturadores();
  const cfg = await prisma.configuracionFacturadores.update({
    where: { id: 1 },
    data: {
      baseMensualMedico: body.baseMensualMedico,
      tarifaProgramada: body.tarifaProgramada,
      tarifaGuardia: body.tarifaGuardia,
      tarifaEmergencia: body.tarifaEmergencia,
      topeMensualMedico: body.topeMensualMedico,
      pctEnfermero: body.pctEnfermero,
      precioProcederSinIva: body.precioProcederSinIva,
    },
  });
  return NextResponse.json(cfg);
}
