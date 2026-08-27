import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Ruta de administración (protegida por el middleware general, no por
// requireProfesionalSession): crea o resetea el acceso de un profesional a
// /portal. El admin define usuario y contraseña y se los pasa a mano — no hay
// autoregistro.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const usuario = String(body.usuario || "").trim().toLowerCase();
  if (!usuario) return NextResponse.json({ error: "El usuario es obligatorio" }, { status: 400 });

  const data: { usuario: string; passwordHash?: string } = { usuario };
  if (body.password) {
    if (String(body.password).length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  try {
    const profesional = await prisma.profesional.update({
      where: { id: params.id },
      data,
      select: { id: true, usuario: true },
    });
    return NextResponse.json(profesional);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
    }
    throw e;
  }
}

// Quita el acceso al portal sin borrar al profesional.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.profesional.update({
    where: { id: params.id },
    data: { usuario: null, passwordHash: null },
  });
  return NextResponse.json({ ok: true });
}
