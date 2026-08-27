import { getSession } from "./auth";
import type { SessionPayload } from "./session";

type ProfesionalSession = SessionPayload & {
  profesionalId: string;
  profesionalRol: "MEDICO" | "ENFERMERO";
};

/**
 * Sesión de un profesional facturador logueado en /portal. Nunca confiar en
 * un profesionalId que venga del cliente: todo lo que lee o escribe una ruta
 * de /api/portal tiene que estar scopeado al profesionalId de ESTA sesión.
 */
export async function requireProfesionalSession(): Promise<ProfesionalSession | null> {
  const session = await getSession();
  if (!session || session.rol !== "PROFESIONAL" || !session.profesionalId || !session.profesionalRol) {
    return null;
  }
  return session as ProfesionalSession;
}
