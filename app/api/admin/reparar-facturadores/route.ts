import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Endpoint temporal, de un solo uso: repara PlanConfig y ConfiguracionFacturadores
// despues de que un deploy de main (schema sin el modulo de facturadores) corriera
// `prisma db push --accept-data-loss` contra la base compartida y borrara la
// columna alertaSemestral (entre otras cosas). Se borra apenas se confirme el
// resultado, junto con el bypass de middleware.
const TOKEN = "R3parF4ct-v2-8sQpX2vLmZ9nK4tYcW";

const PLANES = {
  ESENCIAL_LUNES_VIERNES: { horasMes: 160, precioBase: 65263, costoCuidadorMes: 36800, cupoProcederesMes: 2, alertaAnual: true, alertaSemestral: true },
  ESENCIAL_COMPLETO: { horasMes: 240, precioBase: 92400, costoCuidadorMes: 55200, cupoProcederesMes: 2, alertaAnual: true, alertaSemestral: true },
  EXTENDIDO: { horasMes: 480, precioBase: 184800, costoCuidadorMes: 110400, cupoProcederesMes: 5, alertaAnual: true, alertaSemestral: true },
  INTEGRAL: { horasMes: 720, precioBase: 304920, costoCuidadorMes: 175920, cupoProcederesMes: 10, alertaAnual: true, alertaSemestral: true },
  VIVAM_NOCTURNO: { horasMes: 240, precioBase: 120120, costoCuidadorMes: 65520, cupoProcederesMes: 2, alertaAnual: false, alertaSemestral: false },
};

const FACTURADORES = {
  baseMensualMedico: 8000,
  tarifaProgramada: 400,
  tarifaGuardia: 700,
  tarifaEmergencia: 1200,
  topeMensualMedico: 25000,
  pctEnfermero: 50,
  precioProcederSinIva: 1500,
};

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "token invalido" }, { status: 403 });
  }

  const resultados: string[] = [];
  for (const [plan, datos] of Object.entries(PLANES)) {
    const antes = await prisma.planConfig.findUnique({ where: { plan: plan as never } });
    await prisma.planConfig.upsert({ where: { plan: plan as never }, create: { plan: plan as never, ...datos }, update: datos });
    resultados.push(`${plan}: alertaSemestral ${antes?.alertaSemestral ?? "(no existia)"} -> ${datos.alertaSemestral}`);
  }

  const cfgAntes = await prisma.configuracionFacturadores.findUnique({ where: { id: 1 } });
  await prisma.configuracionFacturadores.upsert({
    where: { id: 1 },
    create: { id: 1, ...FACTURADORES },
    update: FACTURADORES,
  });

  const profesionales = await prisma.profesional.count();

  return NextResponse.json({
    ok: true,
    planes: resultados,
    configuracionFacturadoresExistiaAntes: !!cfgAntes,
    profesionalesEnLaBase: profesionales,
  });
}
