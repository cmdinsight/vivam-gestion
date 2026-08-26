import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renumerarProcederes } from "@/lib/facturadores";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const proceder = await prisma.procederEjecutado.update({
    where: { id: params.id },
    data: { facturado: body.facturado, notas: body.notas },
  });
  return NextResponse.json(proceder);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const proceder = await prisma.procederEjecutado.findUniqueOrThrow({ where: { id: params.id } });
  await prisma.procederEjecutado.delete({ where: { id: params.id } });
  // Sin esto la numeración del mes queda con un hueco y el próximo proceder
  // se contaría mal contra el cupo del plan.
  await renumerarProcederes(proceder.clienteId, proceder.mes);
  return NextResponse.json({ ok: true });
}
