"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TIPO_LLAMADA_LABELS, QUIEN_LLAMA_LABELS, PLAN_LABELS } from "@/lib/format";

type Cliente = {
  id: string;
  nombrePaciente: string;
  familiaResponsable: string;
  contacto: string | null;
  plan: string | null;
};

type NotaGuardia = {
  id: string;
  fecha: string;
  quienLlama: string;
  tipo: string;
  motivo: string;
  datosObjetivos: string | null;
  valoracion: string | null;
  conducta: string | null;
  derivoEmergencia: boolean;
  avisoFamilia: boolean;
  notaCargada: boolean;
  medico: { nombre: string };
};

type Proceder = {
  id: string;
  fecha: string;
  proceder: string;
  notas: string | null;
  enfermero: { nombre: string };
};

type ReporteDiario = {
  id: string;
  fecha: string;
  estadoGeneral: string | null;
  animo: string | null;
  alimentacion: string | null;
  medicacionAdministrada: string | null;
  movilidad: string | null;
  higiene: string | null;
  observaciones: string | null;
  trabajador: { nombre: string };
};

type PlanCfg = { plan: string; cupoProcederesMes: number };

type Evento =
  | { tipo: "NOTA"; fecha: string; data: NotaGuardia }
  | { tipo: "PROCEDER"; fecha: string; data: Proceder }
  | { tipo: "REPORTE"; fecha: string; data: ReporteDiario };

type Modo = "DIA" | "SEMANA" | "MES";

// Las fechas de NotaGuardia/ProcederEjecutado/ReporteDiario son solo
// calendario (sin hora), guardadas como medianoche UTC. Todo el manejo de
// fechas de esta pantalla trabaja con el string "YYYY-MM-DD" y con Date
// locales construidos a mano (y/m/d), nunca con `new Date(isoConHoraUTC)`
// directo, porque en Uruguay (UTC-3) eso corre el día un dia para atrás al
// mostrarlo o compararlo.
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// A partir de un "YYYY-MM-DD" arma un Date local a mediodia, solo para
// formatear (mediodia evita cualquier corrimiento de dia por DST).
function fechaLocalDesdeYmd(fecha: string): Date {
  const [y, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function inicioSemana(d: Date): Date {
  const dia = (d.getDay() + 6) % 7; // 0 = lunes
  const r = new Date(d);
  r.setDate(d.getDate() - dia);
  return r;
}

function rangoDe(modo: Modo, ref: Date): { desde: string; hasta: string } {
  if (modo === "DIA") {
    const s = ymd(ref);
    return { desde: s, hasta: s };
  }
  if (modo === "SEMANA") {
    const inicio = inicioSemana(ref);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    return { desde: ymd(inicio), hasta: ymd(fin) };
  }
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const fin = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { desde: ymd(inicio), hasta: ymd(fin) };
}

// A diferencia de rangoDe (que da el recorte que se está viendo), esto da
// siempre el mes calendario completo que contiene a `ref` — lo necesitan las
// cifras "del mes" del resumen semanal/mensual (cupo de procederes,
// adherencia, etc.) sin importar si estás mirando un día o una semana suelta.
function mesCalendarioDe(ref: Date): { desde: string; hasta: string; mesStr: string } {
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const fin = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { desde: ymd(inicio), hasta: ymd(fin), mesStr: `${ref.getFullYear()}-${pad(ref.getMonth() + 1)}` };
}

function shiftRef(modo: Modo, ref: Date, delta: number): Date {
  const r = new Date(ref);
  if (modo === "DIA") r.setDate(r.getDate() + delta);
  else if (modo === "SEMANA") r.setDate(r.getDate() + delta * 7);
  else r.setMonth(r.getMonth() + delta);
  return r;
}

function fechaCorta(fecha: string): string {
  return fechaLocalDesdeYmd(fecha).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function labelRango(modo: Modo, ref: Date): string {
  const { desde, hasta } = rangoDe(modo, ref);
  if (modo === "DIA") return fechaLocalDesdeYmd(desde).toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (modo === "MES") return fechaLocalDesdeYmd(desde).toLocaleDateString("es-UY", { month: "long", year: "numeric" });
  return `${fechaCorta(desde)} — ${fechaCorta(hasta)}`;
}

// Best-effort: convierte lo que haya en Cliente.contacto a un numero E.164 sin +
// para armar el link de WhatsApp. Queda editable en el input antes de enviar,
// porque el campo Contacto es texto libre y puede traer nombre, telefono fijo, etc.
function telefonoSugerido(contacto: string | null): string {
  if (!contacto) return "";
  const digitos = contacto.replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("598")) return digitos;
  if (digitos.startsWith("0")) return "598" + digitos.slice(1);
  return digitos;
}

function bullets(lineas: string[]): string {
  return lineas.length > 0 ? lineas.map((l) => `• ${l}`).join("\n") : "Sin datos para este período.";
}

// Arma el resumen siguiendo, seccion por seccion, las tres plantillas reales
// de Vivam (Vivam_Formato_Resumenes_Cliente.docx). Donde hay dato real, se
// llena solo; donde hace falta criterio clinico que un script no puede
// inventar (cambios relevantes, cumplimiento del plan, indicadores de
// control), se deja un placeholder para que el equipo lo complete a mano en
// vez de fabricar contenido.
function generarResumen(
  cliente: Cliente,
  eventos: Evento[],
  modo: Modo,
  ref: Date,
  cupoPlan: number | null,
  cuidadores: string[],
  procederesUsadosMes: number
): string {
  const notas = eventos.filter((e): e is Extract<Evento, { tipo: "NOTA" }> => e.tipo === "NOTA");
  const procederes = eventos.filter((e): e is Extract<Evento, { tipo: "PROCEDER" }> => e.tipo === "PROCEDER");
  const reportes = eventos.filter((e): e is Extract<Evento, { tipo: "REPORTE" }> => e.tipo === "REPORTE");
  const planLabel = cliente.plan ? PLAN_LABELS[cliente.plan] : "Por hora (sin plan)";
  const cuidadoresTxt = cuidadores.length > 0 ? cuidadores.join(", ") : "Sin asignación activa";

  if (modo === "DIA") {
    const r = reportes[0]?.data ?? null;
    const incidentes = [
      ...notas.filter((n) => n.data.derivoEmergencia).map((n) => n.data.motivo),
      ...(r?.observaciones ? [r.observaciones] : []),
    ];
    return [
      `Vivam · Reporte diario`,
      fechaCorta(ymd(ref)),
      ``,
      `Estado general`,
      r?.estadoGeneral || "Sin reporte cargado por el cuidador.",
      ``,
      `Ánimo / energía`,
      r?.animo || "—",
      ``,
      `Alimentación (qué y cuánto comió)`,
      r?.alimentacion || "—",
      ``,
      `Medicación administrada (horario y qué se dio)`,
      r?.medicacionAdministrada || "—",
      ``,
      `Movilidad / actividad del día`,
      r?.movilidad || "—",
      ``,
      `Higiene / continencia`,
      r?.higiene || "—",
      ``,
      `Observaciones o incidentes`,
      incidentes.length > 0 ? incidentes.join(". ") : "Sin novedad.",
      ``,
      `Cuidador`,
      r?.trabajador.nombre || cuidadoresTxt,
    ].join("\n");
  }

  const estadoDiario = reportes
    .filter((r) => r.data.estadoGeneral)
    .map((r) => `${fechaCorta(r.fecha)}: ${r.data.estadoGeneral}`);
  const medicacionDiaria = reportes
    .filter((r) => r.data.medicacionAdministrada)
    .map((r) => `${fechaCorta(r.fecha)}: ${r.data.medicacionAdministrada}`);
  const procederesTexto = procederes.map((p) => `${fechaCorta(p.fecha)}: ${p.data.proceder} (${p.data.enfermero.nombre})`);
  const incidentesTexto = [
    ...reportes.filter((r) => r.data.observaciones).map((r) => `${fechaCorta(r.fecha)}: ${r.data.observaciones}`),
    ...notas.filter((n) => n.data.derivoEmergencia).map((n) => `${fechaCorta(n.fecha)}: ${n.data.motivo} (derivado a emergencia)`),
  ];
  const recomendaciones = notas.filter((n) => n.data.conducta).map((n) => `${fechaCorta(n.fecha)}: ${n.data.conducta}`);

  if (modo === "SEMANA") {
    const { desde, hasta } = rangoDe(modo, ref);
    return [
      `Vivam · Reporte semanal`,
      `Semana del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`,
      ``,
      `Paciente`,
      cliente.nombrePaciente,
      ``,
      `Plan contratado`,
      planLabel,
      ``,
      `Estado general de la semana`,
      bullets(estadoDiario),
      ``,
      `Cambios relevantes respecto a la semana anterior`,
      "[Completar por el equipo]",
      ``,
      `Adherencia a la medicación`,
      bullets(medicacionDiaria),
      ``,
      `Procederes de enfermería realizados esta semana`,
      bullets(procederesTexto),
      ``,
      `Cupo de procederes usado / disponible del mes`,
      cupoPlan != null ? `${procederesUsadosMes} usados de ${cupoPlan} disponibles este mes.` : "Sin plan mensual, no aplica cupo.",
      ``,
      `Incidentes reportados`,
      bullets(incidentesTexto),
      ``,
      `Recomendaciones / próximos pasos`,
      bullets(recomendaciones),
      ``,
      `Cuidador(es) asignado(s)`,
      cuidadoresTxt,
    ].join("\n");
  }

  // MES
  const datosObjetivos = notas
    .filter((n) => n.data.datosObjetivos)
    .map((n) => `${fechaCorta(n.fecha)}: ${n.data.datosObjetivos}`);
  return [
    `Vivam · Reporte mensual`,
    fechaLocalDesdeYmd(ymd(ref)).toLocaleDateString("es-UY", { month: "long", year: "numeric" }),
    ``,
    `Paciente`,
    cliente.nombrePaciente,
    ``,
    `Plan contratado`,
    planLabel,
    ``,
    `Evolución general del mes`,
    bullets(estadoDiario),
    ``,
    `Indicadores de control (peso, presión arterial, otros si aplica)`,
    bullets(datosObjetivos),
    ``,
    `Adherencia a la medicación durante el mes`,
    bullets(medicacionDiaria),
    ``,
    `Procederes de enfermería del mes (usados / cupo del plan)`,
    `${procederesUsadosMes} realizado${procederesUsadosMes === 1 ? "" : "s"}${cupoPlan != null ? ` de ${cupoPlan} disponibles.` : "."}`,
    ...(procederesTexto.length > 0 ? [bullets(procederesTexto)] : []),
    ``,
    `Incidentes o emergencias del mes`,
    bullets(incidentesTexto),
    ``,
    `Cumplimiento del plan de cuidado`,
    "[Completar por el equipo]",
    ``,
    `Recomendaciones del equipo médico`,
    bullets(recomendaciones),
    ``,
    `Observaciones de la familia (espacio para feedback)`,
    "[Completar por el equipo]",
  ].join("\n");
}

export default function HistoriaClinicaPage() {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [notas, setNotas] = useState<NotaGuardia[]>([]);
  const [procederes, setProcederes] = useState<Proceder[]>([]);
  const [reportes, setReportes] = useState<ReporteDiario[]>([]);
  const [cuidadores, setCuidadores] = useState<string[]>([]);
  const [cupoPlan, setCupoPlan] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<Modo>("SEMANA");
  const [ref, setRef] = useState(new Date());
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [resumen, setResumen] = useState("");
  const [telefono, setTelefono] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/clientes/${id}`).then((r) => r.json()),
      fetch(`/api/notas-guardia?clienteId=${id}`).then((r) => r.json()),
      fetch(`/api/procederes?clienteId=${id}`).then((r) => r.json()),
      fetch(`/api/reportes-diarios?clienteId=${id}`).then((r) => r.json()),
      fetch(`/api/asignaciones?clienteId=${id}`).then((r) => r.json()),
      fetch(`/api/planes`).then((r) => r.json()),
    ]).then(([c, n, p, r, asign, planesResp]) => {
      setCliente(c);
      setNotas(Array.isArray(n) ? n : []);
      setProcederes(Array.isArray(p) ? p : []);
      setReportes(Array.isArray(r) ? r : []);
      setTelefono(telefonoSugerido(c?.contacto ?? null));

      const nombresCuidadores: string[] = Array.isArray(asign)
        ? [...new Set(asign.filter((a: { activa: boolean }) => a.activa).map((a: { trabajador: { nombre: string } }) => a.trabajador.nombre))]
        : [];
      setCuidadores(nombresCuidadores);

      const planes: PlanCfg[] = planesResp?.planes ?? [];
      const cfg = c?.plan ? planes.find((pc) => pc.plan === c.plan) : null;
      setCupoPlan(cfg?.cupoProcederesMes ?? null);

      setLoading(false);
    });
  }, [id]);

  const { desde, hasta } = rangoDe(modo, ref);

  const eventos = useMemo(() => {
    const deNotas: Evento[] = notas
      .map((n) => ({ tipo: "NOTA" as const, fecha: n.fecha.slice(0, 10), data: n }))
      .filter((e) => e.fecha >= desde && e.fecha <= hasta);
    const deProcederes: Evento[] = procederes
      .map((p) => ({ tipo: "PROCEDER" as const, fecha: p.fecha.slice(0, 10), data: p }))
      .filter((e) => e.fecha >= desde && e.fecha <= hasta);
    const deReportes: Evento[] = reportes
      .map((r) => ({ tipo: "REPORTE" as const, fecha: r.fecha.slice(0, 10), data: r }))
      .filter((e) => e.fecha >= desde && e.fecha <= hasta);
    return [...deNotas, ...deProcederes, ...deReportes].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [notas, procederes, reportes, desde, hasta]);

  // Las cifras "del mes" (procederes/cupo) del resumen semanal/mensual se
  // calculan siempre sobre el mes calendario completo que contiene a `ref`,
  // no sobre el recorte visible — así el semanal de la última semana del mes
  // muestra el cupo del mes entero, no solo el de esos 7 días.
  const eventosDelMes = useMemo(() => {
    const { desde: d, hasta: h } = mesCalendarioDe(ref);
    const deNotas: Evento[] = notas.map((n) => ({ tipo: "NOTA" as const, fecha: n.fecha.slice(0, 10), data: n })).filter((e) => e.fecha >= d && e.fecha <= h);
    const deProcederes: Evento[] = procederes.map((p) => ({ tipo: "PROCEDER" as const, fecha: p.fecha.slice(0, 10), data: p })).filter((e) => e.fecha >= d && e.fecha <= h);
    return [...deNotas, ...deProcederes];
  }, [notas, procederes, ref]);

  function abrirResumen() {
    if (!cliente) return;
    // El texto del resumen (estado diario, medicación, incidentes, etc.) se
    // arma con `eventos`, que respeta la ventana visible (día/semana/mes).
    // El cupo de procederes es la única cifra que siempre habla del mes
    // calendario completo aunque se esté mirando una semana suelta, así que
    // se calcula aparte sobre `eventosDelMes`.
    const procederesUsadosMes = eventosDelMes.filter((e) => e.tipo === "PROCEDER").length;
    setResumen(generarResumen(cliente, eventos, modo, ref, cupoPlan, cuidadores, procederesUsadosMes));
    setMostrarResumen(true);
    setCopiado(false);
  }

  async function copiarResumen() {
    await navigator.clipboard.writeText(resumen);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function enviarPorWhatsapp() {
    const numero = telefono.replace(/\D/g, "");
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(resumen)}`;
    window.open(url, "_blank");
  }

  if (loading || !cliente) return <p className="text-navy/60">Cargando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/clientes/${id}`} className="text-sm text-teal hover:underline">
          ← {cliente.nombrePaciente}
        </Link>
        <h1 className="font-display text-2xl mt-1">Historia clínica</h1>
        <p className="text-navy/60 text-sm">{cliente.familiaResponsable}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {(["DIA", "SEMANA", "MES"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                modo === m ? "bg-teal text-white" : "bg-navy/5 text-navy/70 hover:bg-navy/10"
              }`}
            >
              {m === "DIA" ? "Día" : m === "SEMANA" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button className="btn-ghost px-2 py-1" onClick={() => setRef(shiftRef(modo, ref, -1))}>
            ←
          </button>
          <span className="font-semibold capitalize text-center">{labelRango(modo, ref)}</span>
          <button className="btn-ghost px-2 py-1" onClick={() => setRef(shiftRef(modo, ref, 1))}>
            →
          </button>
        </div>
        <button className="btn-primary text-sm" onClick={abrirResumen}>
          Generar resumen
        </button>
      </div>

      {mostrarResumen && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Resumen para compartir</h2>
            <button className="text-sm text-navy/50 hover:underline" onClick={() => setMostrarResumen(false)}>
              Cerrar
            </button>
          </div>
          <textarea
            className="input font-mono text-sm"
            rows={16}
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
          />
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="label">Número de WhatsApp del familiar</label>
              <input
                className="input"
                placeholder="598099123456"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
              <p className="text-xs text-navy/50 mt-1">Código de país + número, sin espacios ni el +.</p>
            </div>
            <button className="btn-ghost" type="button" onClick={copiarResumen}>
              {copiado ? "Copiado ✓" : "Copiar texto"}
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={enviarPorWhatsapp}
              disabled={telefono.replace(/\D/g, "").length < 8}
            >
              Enviar por WhatsApp
            </button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-navy/5">
        {eventos.length === 0 && (
          <p className="p-6 text-center text-navy/50">Sin eventos registrados en este período.</p>
        )}
        {eventos.map((e) => (
          <div key={`${e.tipo}-${e.data.id}`} className="p-4 flex gap-3">
            <div className="w-16 shrink-0 text-xs text-navy/50 pt-0.5">
              {fechaLocalDesdeYmd(e.fecha).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })}
            </div>
            {e.tipo === "NOTA" ? (
              <div className="flex-1 text-sm">
                <span className="badge bg-navy/10 text-navy mr-2">Consulta médica</span>
                <span className="font-semibold">{TIPO_LLAMADA_LABELS[e.data.tipo]}</span>
                <span className="text-navy/50"> · llamó {QUIEN_LLAMA_LABELS[e.data.quienLlama]} · {e.data.medico.nombre}</span>
                <p className="mt-1">{e.data.motivo}</p>
                {e.data.valoracion && <p className="text-navy/70 mt-0.5">{e.data.valoracion}</p>}
                <div className="flex gap-2 mt-1">
                  {e.data.derivoEmergencia && <span className="badge bg-red-100 text-red-600">Derivado a emergencia</span>}
                  {!e.data.notaCargada && <span className="badge bg-champagne/20 text-champagne">Nota sin cargar</span>}
                </div>
              </div>
            ) : e.tipo === "PROCEDER" ? (
              <div className="flex-1 text-sm">
                <span className="badge bg-teal/15 text-teal mr-2">Proceder de enfermería</span>
                <span className="font-semibold">{e.data.proceder}</span>
                <span className="text-navy/50"> · {e.data.enfermero.nombre}</span>
                {e.data.notas && <p className="mt-1">{e.data.notas}</p>}
              </div>
            ) : (
              <div className="flex-1 text-sm">
                <span className="badge bg-champagne/20 text-champagne mr-2">Reporte diario</span>
                <span className="text-navy/50">{e.data.trabajador.nombre}</span>
                {e.data.estadoGeneral && <p className="mt-1">{e.data.estadoGeneral}</p>}
                {e.data.observaciones && <p className="text-navy/70 mt-0.5">{e.data.observaciones}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
