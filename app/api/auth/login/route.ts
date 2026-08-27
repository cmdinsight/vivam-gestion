import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession, COOKIE_NAME, type SessionPayload } from "@/lib/session";

async function respuestaConSesion(payload: SessionPayload) {
  const token = await signSession(payload);
  const res = NextResponse.json({ ok: true, rol: payload.rol });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function POST(req: NextRequest) {
  const { usuario, password } = await req.json();
  if (!usuario || !password) {
    return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
  }

  const usuarioNorm = String(usuario).toLowerCase();
  const user = await prisma.usuario.findUnique({ where: { usuario: usuarioNorm } });
  if (user && (await bcrypt.compare(password, user.passwordHash))) {
    return respuestaConSesion({ sub: user.id, usuario: user.usuario, nombre: user.nombre, rol: "ADMIN" });
  }

  // No coincidió con un Usuario admin: probamos como login de profesional
  // facturador (médico/enfermero). Sin usuario/passwordHash configurados por
  // el admin, no hay match posible.
  const profesional = await prisma.profesional.findUnique({ where: { usuario: usuarioNorm } });
  if (
    !profesional ||
    !profesional.passwordHash ||
    profesional.estado !== "ACTIVO" ||
    !(await bcrypt.compare(password, profesional.passwordHash))
  ) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  return respuestaConSesion({
    sub: profesional.id,
    usuario: profesional.usuario!,
    nombre: profesional.nombre,
    rol: "PROFESIONAL",
    profesionalId: profesional.id,
    profesionalRol: profesional.rol,
  });
}
