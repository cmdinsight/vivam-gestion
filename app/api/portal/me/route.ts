import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || (session.rol !== "PROFESIONAL" && session.rol !== "CUIDADOR")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const rol = session.rol === "PROFESIONAL" ? session.profesionalRol : "CUIDADOR";
  return NextResponse.json({ nombre: session.nombre, rol });
}
