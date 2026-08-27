import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { montoDeNota, mesDe } from "@/lib/facturadores";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const actual = await prisma.notaGuardia.findUniqueOrThrow({ where: { id: params.id } });

  const fecha = body.fecha ? new Date(body.fecha) : actual.fecha;
  const tipo = body.tipo ?? actual.tipo;
  const notaCargada = body.notaCargada ?? actual.notaCargada;
  // El monto se recalcula siempre: si se marca la nota como cargada, la
  // llamada pasa a ser liquidable; si se desmarca, vuelve a 0.
  const monto = await montoDeNota(tipo, notaCargada);

  const nota = await prisma.notaGuardia.update({
    where: { id: params.id },
    data: {
      fecha,
      mes: mesDe(fecha),
      medicoId: body.medicoId ?? actual.medicoId,
      clienteId: body.clienteId === undefined ? actual.clienteId : body.clienteId || null,
      quienLlama: body.quienLlama ?? actual.quienLlama,
      tipo,
      motivo: body.motivo ?? actual.motivo,
      datosObjetivos: body.datosObjetivos ?? actual.datosObjetivos,
      valoracion: body.valoracion ?? actual.valoracion,
      conducta: body.conducta ?? actual.conducta,
      signosAlarma: body.signosAlarma ?? actual.signosAlarma,
      derivoEmergencia: body.derivoEmergencia ?? actual.derivoEmergencia,
      avisoFamilia: body.avisoFamilia ?? actual.avisoFamilia,
      notaCargada,
      cargadaEn: notaCargada ? actual.cargadaEn ?? new Date() : null,
      montoLiquidado: monto,
    },
  });
  return NextResponse.json(nota);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.notaGuardia.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
