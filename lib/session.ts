import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "vivam_session";
const secret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "vivam-dev-secret-change-me");

export type SessionPayload = {
  sub: string;
  usuario: string;
  nombre: string;
  // Ausente (sesiones viejas de Usuario) o "ADMIN" = acceso completo al panel.
  // "PROFESIONAL" y "CUIDADOR" = solo el portal, ver middleware.ts.
  rol?: "ADMIN" | "PROFESIONAL" | "CUIDADOR";
  profesionalId?: string;
  profesionalRol?: "MEDICO" | "ENFERMERO";
  trabajadorId?: string;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
