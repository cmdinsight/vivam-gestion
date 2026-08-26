import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { actual, nueva } = await req.json();
  if (!actual || !nueva || String(nueva).length < 6) {
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const user = await prisma.usuario.findUnique({ where: { id: session.sub } });
  if (!user || !(await bcrypt.compare(actual, user.passwordHash))) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(nueva, 10);
  await prisma.usuario.update({ where: { id: user.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
