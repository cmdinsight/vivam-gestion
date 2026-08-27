import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Ruta de administración: crea o resetea el acceso de un cuidador a /portal.
// El admin define usuario y contraseña y se los pasa a mano — no hay
// autoregistro. El hash vive en CuidadorAcceso, no en Trabajador.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const usuario = String(body.usuario || "").trim().toLowerCase();
  if (!usuario) return NextResponse.json({ error: "El usuario es obligatorio" }, { status: 400 });

  const accesoActual = await prisma.cuidadorAcceso.findUnique({ where: { trabajadorId: params.id } });
  if (!body.password && !accesoActual) {
    return NextResponse.json({ error: "La contraseña es obligatoria la primera vez" }, { status: 400 });
  }
  if (body.password && String(body.password).length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }
  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : accesoActual!.passwordHash;

  try {
    const acceso = await prisma.cuidadorAcceso.upsert({
      where: { trabajadorId: params.id },
      create: { trabajadorId: params.id, usuario, passwordHash },
      update: { usuario, passwordHash },
      select: { usuario: true },
    });
    return NextResponse.json(acceso);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
    }
    throw e;
  }
}

// Quita el acceso al portal sin borrar al cuidador.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.cuidadorAcceso.deleteMany({ where: { trabajadorId: params.id } });
  return NextResponse.json({ ok: true });
}
