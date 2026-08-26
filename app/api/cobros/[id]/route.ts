import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = { estado: body.estado, notas: body.notas ?? undefined };
  if (body.estado === "COBRADO") {
    data.montoCobrado = body.montoCobrado ?? undefined;
    data.fechaCobro = body.fechaCobro ? new Date(body.fechaCobro) : new Date();
  } else {
    data.montoCobrado = null;
    data.fechaCobro = null;
  }
  const cobro = await prisma.cobro.update({ where: { id: params.id }, data });
  return NextResponse.json(cobro);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.cobro.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
