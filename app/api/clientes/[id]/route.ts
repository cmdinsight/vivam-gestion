import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularPrecioCliente } from "@/lib/planes";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: params.id },
    include: { cobros: { orderBy: { mes: "desc" } } },
  });
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(cliente);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { precio } = await calcularPrecioCliente(body.plan, body.modalidad);
  const cliente = await prisma.cliente.update({
    where: { id: params.id },
    data: {
      nombrePaciente: body.nombrePaciente,
      familiaResponsable: body.familiaResponsable,
      contacto: body.contacto || null,
      zona: body.zona || null,
      plan: body.plan,
      fechaInicio: new Date(body.fechaInicio),
      modalidad: body.modalidad,
      precioMensual: precio,
      estado: body.estado,
      notas: body.notas || null,
    },
  });
  return NextResponse.json(cliente);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.cliente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
