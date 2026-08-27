import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PlanContratado, Modalidad } from "@prisma/client";
import { getPlanesConfig, getModalidadesConfig } from "@/lib/planes";

export const dynamic = "force-dynamic";

export async function GET() {
  const [planes, modalidades] = await Promise.all([getPlanesConfig(), getModalidadesConfig()]);
  return NextResponse.json({ planes, modalidades });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const planes: {
    plan: PlanContratado;
    horasMes: number;
    precioBase: number;
    costoCuidadorMes: number;
    cupoProcederesMes: number;
    alertaAnual: boolean;
    alertaSemestral: boolean;
  }[] = body.planes || [];
  const modalidades: { modalidad: Modalidad; descuentoPct: number }[] = body.modalidades || [];

  await Promise.all([
    ...planes.map((p) =>
      prisma.planConfig.update({
        where: { plan: p.plan },
        data: {
          horasMes: p.horasMes,
          precioBase: p.precioBase,
          costoCuidadorMes: p.costoCuidadorMes,
          cupoProcederesMes: p.cupoProcederesMes,
          alertaAnual: p.alertaAnual,
          alertaSemestral: p.alertaSemestral,
        },
      })
    ),
    ...modalidades.map((m) =>
      prisma.modalidadConfig.update({
        where: { modalidad: m.modalidad },
        data: { descuentoPct: m.descuentoPct },
      })
    ),
  ]);

  const [planesActualizados, modalidadesActualizadas] = await Promise.all([getPlanesConfig(), getModalidadesConfig()]);
  return NextResponse.json({ planes: planesActualizados, modalidades: modalidadesActualizadas });
}
