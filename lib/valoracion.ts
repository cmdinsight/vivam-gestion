import type { TipoMovilidad, TipoContinencia, TipoAyuda, PlanContratado } from "@prisma/client";

// Mapea el body del formulario (mismo shape en el portal del médico y en el
// panel admin) a los datos de ValoracionInicial. Corresponde 1 a 1 con el
// formulario en papel "Vivam_Valoracion_Inicial_Paciente.docx". No incluye
// clienteId/medicoId/fecha: esos los resuelve cada ruta según quién llama.
export function datosValoracion(body: Record<string, unknown>) {
  const s = (v: unknown) => (v === "" || v == null ? null : String(v));
  const n = (v: unknown) => (v === "" || v == null ? null : Number(v));
  return {
    cedulaIdentidad: s(body.cedulaIdentidad),
    direccion: s(body.direccion),
    medicoTratanteHabitual: s(body.medicoTratanteHabitual),
    institucionSalud: s(body.institucionSalud),
    contactoEmergencia: s(body.contactoEmergencia),

    solicitanteNombre: s(body.solicitanteNombre),
    solicitanteVinculo: s(body.solicitanteVinculo),
    solicitanteTelefono: s(body.solicitanteTelefono),
    solicitanteEmail: s(body.solicitanteEmail),
    motivoConsulta: s(body.motivoConsulta),

    patologiasCronicas: s(body.patologiasCronicas),
    cirugiasRecientes: s(body.cirugiasRecientes),
    alergias: s(body.alergias),
    caidasUltimoAnio: s(body.caidasUltimoAnio),
    antecedentesPsiquiatricos: s(body.antecedentesPsiquiatricos),

    movilidad: s(body.movilidad) as TipoMovilidad | null,
    movilidadObs: s(body.movilidadObs),
    continencia: s(body.continencia) as TipoContinencia | null,
    continenciaObs: s(body.continenciaObs),
    alimentacionTipo: s(body.alimentacionTipo) as TipoAyuda | null,
    alimentacionObs: s(body.alimentacionObs),
    higiene: s(body.higiene) as TipoAyuda | null,
    higieneObs: s(body.higieneObs),

    orientacion: s(body.orientacion),
    memoria: s(body.memoria),
    riesgoFugaCognitivo: s(body.riesgoFugaCognitivo),
    capacidadComunicacion: s(body.capacidadComunicacion),

    riesgoCaidas: !!body.riesgoCaidas,
    riesgoEscaras: !!body.riesgoEscaras,
    riesgoAspiracion: !!body.riesgoAspiracion,
    riesgoFuga: !!body.riesgoFuga,
    riesgoDescompensacion: !!body.riesgoDescompensacion,
    riesgoOtro: s(body.riesgoOtro),

    dietaEspecial: s(body.dietaEspecial),
    oxigenoDomiciliario: s(body.oxigenoDomiciliario),
    sonda: s(body.sonda),
    ostomia: s(body.ostomia),
    otrosDispositivos: s(body.otrosDispositivos),

    tipoVivienda: s(body.tipoVivienda),
    barrerasArquitectonicas: s(body.barrerasArquitectonicas),
    banoAdaptado: s(body.banoAdaptado),
    conviveConOtros: s(body.conviveConOtros),

    planRecomendado: s(body.planRecomendado) as PlanContratado | null,
    justificacionClinica: s(body.justificacionClinica),
    cupoProcederesRecomendado: n(body.cupoProcederesRecomendado),
    observacionesCuidador: s(body.observacionesCuidador),
  };
}

export type Medicamento = { farmaco: string; dosis?: string; horario?: string; via?: string };

export function medicamentosValidos(body: Record<string, unknown>): Medicamento[] {
  const lista = Array.isArray(body.medicamentos) ? (body.medicamentos as Medicamento[]) : [];
  return lista.filter((m) => m && typeof m.farmaco === "string" && m.farmaco.trim() !== "");
}
