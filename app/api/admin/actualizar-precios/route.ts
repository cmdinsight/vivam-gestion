import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Endpoint temporal de un solo uso, equivalente a prisma/actualizar-precios.mjs,
// para poder correr la sincronización de precios sin acceso a Node local.
// Se borra en un commit aparte apenas se confirma que corrió bien.
const TOKEN = "uDTfkAGVknE8QzmpLlRmURtLYUTf4XCa";

const PLANES = {
  ESENCIAL_LUNES_VIERNES: { horasMes: 160, precioBase: 65263, costoCuidadorMes: 36800, cupoProcederesMes: 2, alertaAnual: true, alertaSemestral: true },
  ESENCIAL_COMPLETO: { horasMes: 240, precioBase: 92400, costoCuidadorMes: 55200, cupoProcederesMes: 2, alertaAnual: true, alertaSemestral: true },
  EXTENDIDO: { horasMes: 480, precioBase: 184800, costoCuidadorMes: 110400, cupoProcederesMes: 5, alertaAnual: true, alertaSemestral: true },
  INTEGRAL: { horasMes: 720, precioBase: 304920, costoCuidadorMes: 175920, cupoProcederesMes: 10, alertaAnual: true, alertaSemestral: true },
  VIVAM_NOCTURNO: { horasMes: 240, precioBase: 120120, costoCuidadorMes: 65520, cupoProcederesMes: 2, alertaAnual: false, alertaSemestral: false },
} as const;

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
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const cambios: string[] = [];
  for (const [plan, datos] of Object.entries(PLANES)) {
    const antes = await prisma.planConfig.findUnique({ where: { plan: plan as keyof typeof PLANES } });
    await prisma.planConfig.upsert({ where: { plan: plan as keyof typeof PLANES }, create: { plan: plan as keyof typeof PLANES, ...datos }, update: datos });
    const mensual = Math.round(datos.precioBase * 0.95);
    if (antes && Number(antes.precioBase) !== datos.precioBase) {
      const mensualAntes = Math.round(Number(antes.precioBase) * 0.95);
      cambios.push(`${plan}: precioBase ${antes.precioBase} -> ${datos.precioBase} (mensual rotativo ${mensualAntes} -> ${mensual})`);
    } else {
      cambios.push(`${plan}: sin cambios (mensual rotativo ${mensual})`);
    }
  }

  await prisma.configuracionFacturadores.upsert({
    where: { id: 1 },
    create: { id: 1, ...FACTURADORES },
    update: FACTURADORES,
  });

  const clientesActivos = await prisma.cliente.count({ where: { estado: "ACTIVO" } });

  return NextResponse.json({
    ok: true,
    cambios,
    configuracionFacturadores: "sincronizada",
    clientesActivosSinTocar: clientesActivos,
  });
}
