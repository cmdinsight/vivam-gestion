"use client";

import { useEffect, useState } from "react";
import {
  dateInput,
  PLAN_LABELS,
  TIPO_MOVILIDAD_LABELS,
  TIPO_CONTINENCIA_LABELS,
  TIPO_AYUDA_LABELS,
} from "@/lib/format";

type Medicamento = { farmaco: string; dosis: string; horario: string; via: string };

const EMPTY_MEDICAMENTO: Medicamento = { farmaco: "", dosis: "", horario: "", via: "" };

const EMPTY = {
  fecha: dateInput(new Date()),
  medicoId: "",
  cedulaIdentidad: "",
  direccion: "",
  medicoTratanteHabitual: "",
  institucionSalud: "",
  contactoEmergencia: "",
  solicitanteNombre: "",
  solicitanteVinculo: "",
  solicitanteTelefono: "",
  solicitanteEmail: "",
  motivoConsulta: "",
  patologiasCronicas: "",
  cirugiasRecientes: "",
  alergias: "",
  caidasUltimoAnio: "",
  antecedentesPsiquiatricos: "",
  movilidad: "",
  movilidadObs: "",
  continencia: "",
  continenciaObs: "",
  alimentacionTipo: "",
  alimentacionObs: "",
  higiene: "",
  higieneObs: "",
  orientacion: "",
  memoria: "",
  riesgoFugaCognitivo: "",
  capacidadComunicacion: "",
  riesgoCaidas: false,
  riesgoEscaras: false,
  riesgoAspiracion: false,
  riesgoFuga: false,
  riesgoDescompensacion: false,
  riesgoOtro: "",
  dietaEspecial: "",
  oxigenoDomiciliario: "",
  sonda: "",
  ostomia: "",
  otrosDispositivos: "",
  tipoVivienda: "",
  barrerasArquitectonicas: "",
  banoAdaptado: "",
  conviveConOtros: "",
  planRecomendado: "",
  justificacionClinica: "",
  cupoProcederesRecomendado: "",
  observacionesCuidador: "",
};

type Opcion = { id: string; nombre: string };

export default function ValoracionForm({
  clienteId,
  cargarUrl,
  guardarUrl,
  guardarMetodo,
  medicos,
}: {
  clienteId: string;
  cargarUrl: string;
  guardarUrl: string;
  guardarMetodo: "POST" | "PUT";
  // Si se pasa, se muestra un selector de médico (panel admin). Si no, el
  // servidor atribuye la valoración al médico logueado (portal).
  medicos?: Opcion[];
}) {
  const [form, setForm] = useState(EMPTY);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [existia, setExistia] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(cargarUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (v) {
          setExistia(true);
          setForm({
            fecha: dateInput(v.fecha),
            medicoId: v.medicoId ?? "",
            cedulaIdentidad: v.cedulaIdentidad ?? "",
            direccion: v.direccion ?? "",
            medicoTratanteHabitual: v.medicoTratanteHabitual ?? "",
            institucionSalud: v.institucionSalud ?? "",
            contactoEmergencia: v.contactoEmergencia ?? "",
            solicitanteNombre: v.solicitanteNombre ?? "",
            solicitanteVinculo: v.solicitanteVinculo ?? "",
            solicitanteTelefono: v.solicitanteTelefono ?? "",
            solicitanteEmail: v.solicitanteEmail ?? "",
            motivoConsulta: v.motivoConsulta ?? "",
            patologiasCronicas: v.patologiasCronicas ?? "",
            cirugiasRecientes: v.cirugiasRecientes ?? "",
            alergias: v.alergias ?? "",
            caidasUltimoAnio: v.caidasUltimoAnio ?? "",
            antecedentesPsiquiatricos: v.antecedentesPsiquiatricos ?? "",
            movilidad: v.movilidad ?? "",
            movilidadObs: v.movilidadObs ?? "",
            continencia: v.continencia ?? "",
            continenciaObs: v.continenciaObs ?? "",
            alimentacionTipo: v.alimentacionTipo ?? "",
            alimentacionObs: v.alimentacionObs ?? "",
            higiene: v.higiene ?? "",
            higieneObs: v.higieneObs ?? "",
            orientacion: v.orientacion ?? "",
            memoria: v.memoria ?? "",
            riesgoFugaCognitivo: v.riesgoFugaCognitivo ?? "",
            capacidadComunicacion: v.capacidadComunicacion ?? "",
            riesgoCaidas: !!v.riesgoCaidas,
            riesgoEscaras: !!v.riesgoEscaras,
            riesgoAspiracion: !!v.riesgoAspiracion,
            riesgoFuga: !!v.riesgoFuga,
            riesgoDescompensacion: !!v.riesgoDescompensacion,
            riesgoOtro: v.riesgoOtro ?? "",
            dietaEspecial: v.dietaEspecial ?? "",
            oxigenoDomiciliario: v.oxigenoDomiciliario ?? "",
            sonda: v.sonda ?? "",
            ostomia: v.ostomia ?? "",
            otrosDispositivos: v.otrosDispositivos ?? "",
            tipoVivienda: v.tipoVivienda ?? "",
            barrerasArquitectonicas: v.barrerasArquitectonicas ?? "",
            banoAdaptado: v.banoAdaptado ?? "",
            conviveConOtros: v.conviveConOtros ?? "",
            planRecomendado: v.planRecomendado ?? "",
            justificacionClinica: v.justificacionClinica ?? "",
            cupoProcederesRecomendado: v.cupoProcederesRecomendado?.toString() ?? "",
            observacionesCuidador: v.observacionesCuidador ?? "",
          });
          setMedicamentos(
            (v.medicamentos ?? []).map((m: Medicamento) => ({
              farmaco: m.farmaco,
              dosis: m.dosis ?? "",
              horario: m.horario ?? "",
              via: m.via ?? "",
            }))
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cargarUrl]);

  function setCampo<K extends keyof typeof EMPTY>(campo: K, valor: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function setMedicamento(i: number, campo: keyof Medicamento, valor: string) {
    setMedicamentos((ms) => ms.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setOk(false);
    const res = await fetch(guardarUrl, {
      method: guardarMetodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clienteId, medicamentos }),
    });
    setGuardando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo guardar la valoración");
      return;
    }
    setExistia(true);
    setOk(true);
  }

  if (loading) return <p className="text-navy/60">Cargando…</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Fecha de la valoración</label>
          <input className="input" type="date" required value={form.fecha} onChange={(e) => setCampo("fecha", e.target.value)} />
        </div>
        {medicos && (
          <div>
            <label className="label">Médico evaluador</label>
            <select className="input" required value={form.medicoId} onChange={(e) => setCampo("medicoId", e.target.value)}>
              <option value="">Elegir…</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <section className="card p-5 space-y-4">
        <h2 className="font-display text-lg">1. Datos del paciente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Cédula de identidad</label>
            <input className="input" value={form.cedulaIdentidad} onChange={(e) => setCampo("cedulaIdentidad", e.target.value)} />
          </div>
          <div>
            <label className="label">Dirección del domicilio</label>
            <input className="input" value={form.direccion} onChange={(e) => setCampo("direccion", e.target.value)} />
          </div>
          <div>
            <label className="label">Médico tratante habitual</label>
            <input
              className="input"
              value={form.medicoTratanteHabitual}
              onChange={(e) => setCampo("medicoTratanteHabitual", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Institución de salud / mutualista</label>
            <input className="input" value={form.institucionSalud} onChange={(e) => setCampo("institucionSalud", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Contacto de emergencia (nombre y teléfono)</label>
            <input
              className="input"
              value={form.contactoEmergencia}
              onChange={(e) => setCampo("contactoEmergencia", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-display text-lg">2. Datos de quien solicita el servicio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" value={form.solicitanteNombre} onChange={(e) => setCampo("solicitanteNombre", e.target.value)} />
          </div>
          <div>
            <label className="label">Vínculo con el paciente</label>
            <input className="input" value={form.solicitanteVinculo} onChange={(e) => setCampo("solicitanteVinculo", e.target.value)} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.solicitanteTelefono} onChange={(e) => setCampo("solicitanteTelefono", e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.solicitanteEmail} onChange={(e) => setCampo("solicitanteEmail", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Motivo de la consulta / por qué buscan cuidado domiciliario</label>
            <textarea className="input" rows={2} value={form.motivoConsulta} onChange={(e) => setCampo("motivoConsulta", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-display text-lg">3. Antecedentes médicos</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">Patologías crónicas (diabetes, hipertensión, cardiopatías, EPOC, etc.)</label>
            <textarea className="input" rows={2} value={form.patologiasCronicas} onChange={(e) => setCampo("patologiasCronicas", e.target.value)} />
          </div>
          <div>
            <label className="label">Cirugías recientes o relevantes</label>
            <textarea className="input" rows={2} value={form.cirugiasRecientes} onChange={(e) => setCampo("cirugiasRecientes", e.target.value)} />
          </div>
          <div>
            <label className="label">Alergias conocidas</label>
            <input className="input" value={form.alergias} onChange={(e) => setCampo("alergias", e.target.value)} />
          </div>
          <div>
            <label className="label">Antecedentes de caídas en el último año</label>
            <input className="input" value={form.caidasUltimoAnio} onChange={(e) => setCampo("caidasUltimoAnio", e.target.value)} />
          </div>
          <div>
            <label className="label">Antecedentes psiquiátricos / deterioro cognitivo diagnosticado</label>
            <input
              className="input"
              value={form.antecedentesPsiquiatricos}
              onChange={(e) => setCampo("antecedentesPsiquiatricos", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">4. Medicación actual</h2>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => setMedicamentos((ms) => [...ms, { ...EMPTY_MEDICAMENTO }])}
          >
            + Agregar fármaco
          </button>
        </div>
        {medicamentos.length === 0 && <p className="text-sm text-navy/50">Sin medicación registrada.</p>}
        {medicamentos.map((m, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end border-b border-navy/5 pb-3">
            <div className="sm:col-span-2">
              <label className="label">Fármaco</label>
              <input className="input" value={m.farmaco} onChange={(e) => setMedicamento(i, "farmaco", e.target.value)} />
            </div>
            <div>
              <label className="label">Dosis</label>
              <input className="input" value={m.dosis} onChange={(e) => setMedicamento(i, "dosis", e.target.value)} />
            </div>
            <div>
              <label className="label">Horario</label>
              <input className="input" value={m.horario} onChange={(e) => setMedicamento(i, "horario", e.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Vía</label>
                <input className="input" value={m.via} onChange={(e) => setMedicamento(i, "via", e.target.value)} />
              </div>
              <button
                type="button"
                className="text-red-500 hover:underline text-sm pb-2"
                onClick={() => setMedicamentos((ms) => ms.filter((_, idx) => idx !== i))}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-display text-lg">5. Evaluación funcional</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Movilidad</label>
            <select className="input" value={form.movilidad} onChange={(e) => setCampo("movilidad", e.target.value)}>
              <option value="">Sin especificar</option>
              {Object.entries(TIPO_MOVILIDAD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Observaciones de movilidad</label>
            <input className="input" value={form.movilidadObs} onChange={(e) => setCampo("movilidadObs", e.target.value)} />
          </div>
          <div>
            <label className="label">Continencia</label>
            <select className="input" value={form.continencia} onChange={(e) => setCampo("continencia", e.target.value)}>
              <option value="">Sin especificar</option>
              {Object.entries(TIPO_CONTINENCIA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Observaciones de continencia</label>
            <input className="input" value={form.continenciaObs} onChange={(e) => setCampo("continenciaObs", e.target.value)} />
          </div>
          <div>
            <label className="label">Alimentación</label>
            <select className="input" value={form.alimentacionTipo} onChange={(e) => setCampo("alimentacionTipo", e.target.value)}>
              <option value="">Sin especificar</option>
              {Object.entries(TIPO_AYUDA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Observaciones de alimentación</label>
            <input className="input" value={form.alimentacionObs} onChange={(e) => setCampo("alimentacionObs", e.target.value)} />
          </div>
          <div>
            <label className="label">Higiene personal</label>
            <select className="input" value={form.higiene} onChange={(e) => setCampo("higiene", e.target.value)}>
              <option value="">Sin especificar</option>
              {Object.entries(TIPO_AYUDA_LABELS)
                .filter(([k]) => k !== "SONDA")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label">Observaciones de higiene</label>
            <input className="input" value={form.higieneObs} onChange={(e) => setCampo("higieneObs", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-display text-lg">6. Evaluación cognitiva breve</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Orientación en tiempo y espacio</label>
            <input className="input" value={form.orientacion} onChange={(e) => setCampo("orientacion", e.target.value)} />
          </div>
          <div>
            <label className="label">Memoria (reciente / remota)</label>
            <input className="input" value={form.memoria} onChange={(e) => setCampo("memoria", e.target.value)} />
          </div>
          <div>
            <label className="label">Riesgo de fuga / deambulación errática</label>
            <input className="input" value={form.riesgoFugaCognitivo} onChange={(e) => setCampo("riesgoFugaCognitivo", e.target.value)} />
          </div>
          <div>
            <label className="label">Capacidad de comunicación</label>
            <input className="input" value={form.capacidadComunicacion} onChange={(e) => setCampo("capacidadComunicacion", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-display text-lg">7. Riesgos identificados</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.riesgoCaidas} onChange={(e) => setCampo("riesgoCaidas", e.target.checked)} />
            Riesgo de caídas
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.riesgoEscaras} onChange={(e) => setCampo("riesgoEscaras", e.target.checked)} />
            Riesgo de escaras / úlceras por presión
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.riesgoAspiracion} onChange={(e) => setCampo("riesgoAspiracion", e.target.checked)} />
            Riesgo de aspiración (dificultad para tragar)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.riesgoFuga} onChange={(e) => setCampo("riesgoFuga", e.target.checked)} />
            Riesgo de fuga (por deterioro cognitivo)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.riesgoDescompensacion}
              onChange={(e) => setCampo("riesgoDescompensacion", e.target.checked)}
            />
            Riesgo de descompensación cardiovascular o respiratoria
          </label>
        </div>
        <div>
          <label className="label">Otro riesgo</label>
          <input className="input" value={form.riesgoOtro} onChange={(e) => setCampo("riesgoOtro", e.target.value)} />
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-display text-lg">8. Necesidades especiales y dispositivos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Dieta especial</label>
            <input className="input" value={form.dietaEspecial} onChange={(e) => setCampo("dietaEspecial", e.target.value)} />
          </div>
          <div>
            <label className="label">Oxígeno domiciliario</label>
            <input className="input" value={form.oxigenoDomiciliario} onChange={(e) => setCampo("oxigenoDomiciliario", e.target.value)} />
          </div>
          <div>
            <label className="label">Sonda (vesical / nasogástrica / otra)</label>
            <input className="input" value={form.sonda} onChange={(e) => setCampo("sonda", e.target.value)} />
          </div>
          <div>
            <label className="label">Ostomía</label>
            <input className="input" value={form.ostomia} onChange={(e) => setCampo("ostomia", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Otros dispositivos médicos</label>
            <input className="input" value={form.otrosDispositivos} onChange={(e) => setCampo("otrosDispositivos", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-display text-lg">9. Entorno domiciliario</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo de vivienda</label>
            <input className="input" value={form.tipoVivienda} onChange={(e) => setCampo("tipoVivienda", e.target.value)} />
          </div>
          <div>
            <label className="label">Escaleras / barreras arquitectónicas</label>
            <input
              className="input"
              value={form.barrerasArquitectonicas}
              onChange={(e) => setCampo("barrerasArquitectonicas", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Baño adaptado</label>
            <input className="input" value={form.banoAdaptado} onChange={(e) => setCampo("banoAdaptado", e.target.value)} />
          </div>
          <div>
            <label className="label">Convive con otras personas</label>
            <input className="input" value={form.conviveConOtros} onChange={(e) => setCampo("conviveConOtros", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-display text-lg">10. Plan de cuidado sugerido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Plan recomendado</label>
            <select className="input" value={form.planRecomendado} onChange={(e) => setCampo("planRecomendado", e.target.value)}>
              <option value="">Sin especificar</option>
              {Object.entries(PLAN_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cupo de procederes de enfermería recomendado</label>
            <input
              className="input"
              type="number"
              value={form.cupoProcederesRecomendado}
              onChange={(e) => setCampo("cupoProcederesRecomendado", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Justificación clínica del plan</label>
            <textarea
              className="input"
              rows={2}
              value={form.justificacionClinica}
              onChange={(e) => setCampo("justificacionClinica", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observaciones adicionales para el cuidador asignado</label>
            <textarea
              className="input"
              rows={2}
              value={form.observacionesCuidador}
              onChange={(e) => setCampo("observacionesCuidador", e.target.value)}
            />
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-teal">Valoración guardada.</p>}
      <button className="btn-primary" type="submit" disabled={guardando}>
        {guardando ? "Guardando…" : existia ? "Actualizar valoración" : "Guardar valoración"}
      </button>
    </form>
  );
}
