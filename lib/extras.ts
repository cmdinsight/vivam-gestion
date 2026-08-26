import { prisma } from "./prisma";

const DEFAULTS_EXTRAS = [
  {
    nombre: "Visita médica domiciliaria (Dr. González)",
    precioSinIva: 2000,
    unidad: "POR_VISITA" as const,
    aplicaIva: true,
    descripcion: null,
  },
  {
    nombre: "Reporte semanal escrito (PDF) para familia",
    precioSinIva: 1200,
    unidad: "POR_MES" as const,
    aplicaIva: true,
    descripcion: "Servicio opcional, tarifa fija mensual. El reporte diario verbal ya está incluido en todos los planes.",
  },
];

export async function getExtrasConfig() {
  const existentes = await prisma.extraServicio.findMany({ orderBy: { createdAt: "asc" } });
  if (existentes.length === 0) {
    await prisma.extraServicio.createMany({ data: DEFAULTS_EXTRAS });
    return prisma.extraServicio.findMany({ orderBy: { createdAt: "asc" } });
  }
  return existentes;
}
