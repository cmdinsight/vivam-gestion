import { NextRequest, NextResponse } from "next/server";
import { registrarPago, saldoProvision } from "@/lib/payroll";
import { currentMonth } from "@/lib/format";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { trabajadorId, tipo, monto } = await req.json();
  if (!trabajadorId || !tipo) {
    return NextResponse.json({ error: "Falta trabajadorId o tipo" }, { status: 400 });
  }

  const saldo = await saldoProvision(trabajadorId, tipo);
  const montoPago = monto ? new Prisma.Decimal(monto) : saldo;

  if (montoPago.lte(0)) {
    return NextResponse.json({ error: "No hay saldo acumulado para pagar" }, { status: 400 });
  }
  if (montoPago.gt(saldo)) {
    return NextResponse.json({ error: "El monto supera el saldo acumulado" }, { status: 400 });
  }

  const mes = currentMonth();
  const movimiento = await registrarPago(trabajadorId, tipo, montoPago, mes);
  return NextResponse.json(movimiento, { status: 201 });
}
