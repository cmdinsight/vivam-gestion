import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularPrecioCliente } from "@/lib/planes";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientes = await prisma.cliente.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { precio } = await calcularPrecioCliente(body.plan, body.modalidad);
  const cliente = await prisma.cliente.create({
    data: {
      nombrePaciente: body.nombrePaciente,
      familiaResponsable: body.familiaResponsable,
      contacto: body.contacto || null,
      zona: body.zona || null,
      plan: body.plan,
      fechaInicio: new Date(body.fechaInicio),
      modalidad: body.modalidad,
      precioMensual: precio,
      estado: body.estado || "PROSPECTO",
      notas: body.notas || null,
    },
  });
  return NextResponse.json(cliente, { status: 201 });
}
