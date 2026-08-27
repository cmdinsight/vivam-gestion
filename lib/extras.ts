import { prisma } from "./prisma";

// Catálogo espejo de la hoja Extras_y_Procederes de la Matriz Maestra.
// Si acá y en la matriz difieren, la matriz manda: hay que corregir esta lista.
const DEFAULTS_EXTRAS = [
  {
    nombre: "Proceder de enfermería fuera de cupo",
    precioSinIva: 1500,
    unidad: "POR_VISITA" as const,
    aplicaIva: true,
    descripcion:
      "Por cada proceder adicional al cupo del plan. De este monto se le paga al enfermero facturador el % definido en Configuración de facturadores (50% por defecto). Los procederes DENTRO del cupo no se cobran pero sí se pagan.",
  },
  {
    nombre: "Acompañamiento médico a consulta externa",
    precioSinIva: 2500,
    unidad: "POR_VISITA" as const,
    aplicaIva: true,
    descripcion: "El cuidador acompaña al paciente al centro de salud.",
  },
  {
    nombre: "Visita médica domiciliaria (Dr. González)",
    precioSinIva: 2000,
    unidad: "POR_VISITA" as const,
    aplicaIva: true,
    descripcion:
      "Evaluación clínica programada en el domicilio. No es urgencia ni reemplaza la guardia telefónica, que está incluida en el plan.",
  },
  {
    nombre: "Reporte semanal escrito (PDF) para familia",
    precioSinIva: 1200,
    unidad: "POR_MES" as const,
    aplicaIva: true,
    descripcion:
      "Servicio opcional, tarifa fija mensual. Incluye la sección de intervenciones de la dirección médica de la semana. El reporte diario escrito por WhatsApp ya está incluido en todos los planes.",
  },
];

/**
 * Devuelve el catálogo de extras, creando los que falten.
 *
 * OJO: la versión anterior solo sembraba cuando la tabla estaba VACÍA, así que
 * agregar un extra nuevo a esta lista no lo daba de alta en una base que ya
 * tenía datos. Ahora se siembra por nombre, uno por uno.
 */
export async function getExtrasConfig() {
  const existentes = await prisma.extraServicio.findMany({ orderBy: { createdAt: "asc" } });
  const nombres = new Set(existentes.map((e) => e.nombre));
  const faltantes = DEFAULTS_EXTRAS.filter((e) => !nombres.has(e.nombre));

  if (faltantes.length > 0) {
    await prisma.extraServicio.createMany({ data: faltantes });
    return prisma.extraServicio.findMany({ orderBy: { createdAt: "asc" } });
  }
  return existentes;
}
