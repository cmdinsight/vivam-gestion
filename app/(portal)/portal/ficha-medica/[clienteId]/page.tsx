"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  PLAN_LABELS,
  TIPO_MOVILIDAD_LABELS,
  TIPO_CONTINENCIA_LABELS,
  TIPO_AYUDA_LABELS,
} from "@/lib/format";

type Medicamento = { id: string; farmaco: string; dosis: string | null; horario: string | null; via: string | null };

type Valoracion = {
  fecha: string;
  medico: { nombre: string };
  cedulaIdentidad: string | null;
  direccion: string | null;
  medicoTratanteHabitual: string | null;
  institucionSalud: string | null;
  contactoEmergencia: string | null;
  motivoConsulta: string | null;
  patologiasCronicas: string | null;
  cirugiasRecientes: string | null;
  alergias: string | null;
  caidasUltimoAnio: string | null;
  antecedentesPsiquiatricos: string | null;
  medicamentos: Medicamento[];
  movilidad: string | null;
  movilidadObs: string | null;
  continencia: string | null;
  continenciaObs: string | null;
  alimentacionTipo: string | null;
  alimentacionObs: string | null;
  higiene: string | null;
  higieneObs: string | null;
  orientacion: string | null;
  memoria: string | null;
  riesgoFugaCognitivo: string | null;
  capacidadComunicacion: string | null;
  riesgoCaidas: boolean;
  riesgoEscaras: boolean;
  riesgoAspiracion: boolean;
  riesgoFuga: boolean;
  riesgoDescompensacion: boolean;
  riesgoOtro: string | null;
  dietaEspecial: string | null;
  oxigenoDomiciliario: string | null;
  sonda: string | null;
  ostomia: string | null;
  otrosDispositivos: string | null;
  tipoVivienda: string | null;
  barrerasArquitectonicas: string | null;
  banoAdaptado: string | null;
  conviveConOtros: string | null;
  planRecomendado: string | null;
  justificacionClinica: string | null;
  cupoProcederesRecomendado: number | null;
  observacionesCuidador: string | null;
};

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-navy/50">{label}</p>
      <p className="text-sm">{valor}</p>
    </div>
  );
}

export default function FichaMedicaPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const [valoracion, setValoracion] = useState<Valoracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/ficha-medica?clienteId=${clienteId}`)
      .then(async (r) => {
        if (!r.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        setValoracion(await r.json());
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [clienteId]);

  const riesgos = valoracion
    ? [
        valoracion.riesgoCaidas && "Caídas",
        valoracion.riesgoEscaras && "Escaras / úlceras por presión",
        valoracion.riesgoAspiracion && "Aspiración",
        valoracion.riesgoFuga && "Fuga (deterioro cognitivo)",
        valoracion.riesgoDescompensacion && "Descompensación cardiovascular o respiratoria",
        valoracion.riesgoOtro,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      <Link href="/portal/reportar" className="text-sm text-teal hover:underline">
        ← Volver
      </Link>
      <h1 className="font-display text-2xl">Ficha médica</h1>

      {error ? (
        <p className="text-red-600">No se pudo cargar la ficha médica.</p>
      ) : loading ? (
        <p className="text-navy/60">Cargando…</p>
      ) : !valoracion ? (
        <p className="text-navy/50">Este paciente todavía no tiene una valoración inicial cargada.</p>
      ) : (
        <div className="space-y-4">
          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Valoración realizada por" valor={valoracion.medico.nombre} />
            <Campo label="Fecha" valor={new Date(valoracion.fecha).toLocaleDateString("es-UY", { timeZone: "UTC" })} />
            <Campo label="Institución de salud" valor={valoracion.institucionSalud} />
            <Campo label="Médico tratante habitual" valor={valoracion.medicoTratanteHabitual} />
            <Campo label="Contacto de emergencia" valor={valoracion.contactoEmergencia} />
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="font-display text-lg">Antecedentes médicos</h2>
            <Campo label="Patologías crónicas" valor={valoracion.patologiasCronicas} />
            <Campo label="Cirugías recientes" valor={valoracion.cirugiasRecientes} />
            <Campo label="Alergias" valor={valoracion.alergias} />
            <Campo label="Caídas en el último año" valor={valoracion.caidasUltimoAnio} />
            <Campo label="Antecedentes psiquiátricos / cognitivos" valor={valoracion.antecedentesPsiquiatricos} />
          </div>

          {valoracion.medicamentos.length > 0 && (
            <div className="card p-5 space-y-2">
              <h2 className="font-display text-lg mb-1">Medicación actual</h2>
              {valoracion.medicamentos.map((m) => (
                <p key={m.id} className="text-sm">
                  <span className="font-semibold">{m.farmaco}</span>
                  {m.dosis && ` — ${m.dosis}`}
                  {m.horario && ` — ${m.horario}`}
                  {m.via && ` — ${m.via}`}
                </p>
              ))}
            </div>
          )}

          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <h2 className="font-display text-lg sm:col-span-2">Evaluación funcional</h2>
            <Campo label="Movilidad" valor={valoracion.movilidad ? TIPO_MOVILIDAD_LABELS[valoracion.movilidad] : null} />
            <Campo label="Obs. movilidad" valor={valoracion.movilidadObs} />
            <Campo label="Continencia" valor={valoracion.continencia ? TIPO_CONTINENCIA_LABELS[valoracion.continencia] : null} />
            <Campo label="Obs. continencia" valor={valoracion.continenciaObs} />
            <Campo
              label="Alimentación"
              valor={valoracion.alimentacionTipo ? TIPO_AYUDA_LABELS[valoracion.alimentacionTipo] : null}
            />
            <Campo label="Obs. alimentación" valor={valoracion.alimentacionObs} />
            <Campo label="Higiene" valor={valoracion.higiene ? TIPO_AYUDA_LABELS[valoracion.higiene] : null} />
            <Campo label="Obs. higiene" valor={valoracion.higieneObs} />
          </div>

          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <h2 className="font-display text-lg sm:col-span-2">Evaluación cognitiva</h2>
            <Campo label="Orientación" valor={valoracion.orientacion} />
            <Campo label="Memoria" valor={valoracion.memoria} />
            <Campo label="Riesgo de fuga" valor={valoracion.riesgoFugaCognitivo} />
            <Campo label="Capacidad de comunicación" valor={valoracion.capacidadComunicacion} />
          </div>

          {riesgos.length > 0 && (
            <div className="card p-5">
              <h2 className="font-display text-lg mb-2">Riesgos identificados</h2>
              <div className="flex flex-wrap gap-2">
                {riesgos.map((r, i) => (
                  <span key={i} className="badge bg-red-100 text-red-600">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <h2 className="font-display text-lg sm:col-span-2">Necesidades especiales y entorno</h2>
            <Campo label="Dieta especial" valor={valoracion.dietaEspecial} />
            <Campo label="Oxígeno domiciliario" valor={valoracion.oxigenoDomiciliario} />
            <Campo label="Sonda" valor={valoracion.sonda} />
            <Campo label="Ostomía" valor={valoracion.ostomia} />
            <Campo label="Otros dispositivos" valor={valoracion.otrosDispositivos} />
            <Campo label="Tipo de vivienda" valor={valoracion.tipoVivienda} />
            <Campo label="Barreras arquitectónicas" valor={valoracion.barrerasArquitectonicas} />
            <Campo label="Baño adaptado" valor={valoracion.banoAdaptado} />
            <Campo label="Convive con" valor={valoracion.conviveConOtros} />
          </div>

          <div className="card p-5 space-y-2">
            <h2 className="font-display text-lg">Plan de cuidado sugerido</h2>
            <Campo label="Plan recomendado" valor={valoracion.planRecomendado ? PLAN_LABELS[valoracion.planRecomendado] : null} />
            <Campo label="Justificación clínica" valor={valoracion.justificacionClinica} />
            <Campo
              label="Cupo de procederes recomendado"
              valor={valoracion.cupoProcederesRecomendado != null ? String(valoracion.cupoProcederesRecomendado) : null}
            />
            <Campo label="Observaciones para el cuidador" valor={valoracion.observacionesCuidador} />
          </div>
        </div>
      )}
    </div>
  );
}
