import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = process.env.SETUP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SETUP_SECRET no configurado en el servidor" }, { status: 404 });
  }

  const body = await req.json();
  if (body.secret !== secret) {
    return NextResponse.json({ error: "Clave de configuración incorrecta" }, { status: 403 });
  }

  const existentes = await prisma.usuario.count();
  if (existentes > 0) {
    return NextResponse.json({ error: "Ya existen usuarios creados. Este paso solo se usa una vez." }, { status: 403 });
  }

  const usuarios: { usuario: string; nombre: string; password: string }[] = body.usuarios || [];
  if (usuarios.length === 0) {
    return NextResponse.json({ error: "No se enviaron usuarios" }, { status: 400 });
  }

  for (const u of usuarios) {
    if (!u.usuario || !u.nombre || !u.password || u.password.length < 6) {
      return NextResponse.json({ error: `Datos incompletos para ${u.usuario || "usuario"}` }, { status: 400 });
    }
  }

  const creados = await Promise.all(
    usuarios.map(async (u) => {
      const passwordHash = await bcrypt.hash(u.password, 10);
      return prisma.usuario.create({
        data: { usuario: u.usuario.toLowerCase(), nombre: u.nombre, passwordHash },
      });
    })
  );

  return NextResponse.json({ ok: true, creados: creados.map((c) => c.usuario) });
}
