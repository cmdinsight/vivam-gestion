import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExtrasConfig } from "@/lib/extras";

export const dynamic = "force-dynamic";

export async function GET() {
  const extras = await getExtrasConfig();
  return NextResponse.json(extras);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const extra = await prisma.extraServicio.create({
    data: {
      nombre: body.nombre,
      precioSinIva: body.precioSinIva,
      unidad: body.unidad,
      aplicaIva: body.aplicaIva ?? true,
      descripcion: body.descripcion || null,
    },
  });
  return NextResponse.json(extra, { status: 201 });
}

// Guarda cambios en lote sobre extras existentes (edición inline en Configuración).
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const extras: {
    id: string;
    nombre: string;
    precioSinIva: number;
    unidad: string;
    aplicaIva: boolean;
    activo: boolean;
  }[] = body.extras || [];

  await Promise.all(
    extras.map((e) =>
      prisma.extraServicio.update({
        where: { id: e.id },
        data: {
          nombre: e.nombre,
          precioSinIva: e.precioSinIva,
          unidad: e.unidad as "POR_VISITA" | "POR_MES",
          aplicaIva: e.aplicaIva,
          activo: e.activo,
        },
      })
    )
  );

  const actualizados = await prisma.extraServicio.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(actualizados);
}
