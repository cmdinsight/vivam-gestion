import { NextResponse } from "next/server";
import { requireProfesionalSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireProfesionalSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  return NextResponse.json({ nombre: session.nombre, rol: session.profesionalRol });
}
