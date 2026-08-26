import { NextRequest, NextResponse } from "next/server";
import { procesarMes } from "@/lib/payroll";

export async function POST(req: NextRequest) {
  const { trabajadorId, mes } = await req.json();
  if (!trabajadorId || !mes) {
    return NextResponse.json({ error: "Falta trabajadorId o mes" }, { status: 400 });
  }
  const liquidacion = await procesarMes(trabajadorId, mes);
  return NextResponse.json(liquidacion, { status: 201 });
}
