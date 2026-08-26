import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession, COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { usuario, password } = await req.json();
  if (!usuario || !password) {
    return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
  }

  const user = await prisma.usuario.findUnique({ where: { usuario: String(usuario).toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const token = await signSession({ sub: user.id, usuario: user.usuario, nombre: user.nombre });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
