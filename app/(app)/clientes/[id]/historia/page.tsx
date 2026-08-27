"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TIPO_LLAMADA_LABELS, QUIEN_LLAMA_LABELS } from "@/lib/format";

type Cliente = {
  id: string;
  nombrePaciente: string;
  familiaResponsable: string;
  contacto: string | null;
};

type NotaGuardia = {
  id: string;
  fecha: string;
  quienLlama: string;
  tipo: string;
  motivo: string;
  valoracion: string | null;
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

type Evento =
  | { tipo: "NOTA"; fecha: string; data: NotaGuardia }
  | { tipo: "PROCEDER"; fecha: string; data: Proceder };

type Modo = "DIA" | "SEMANA" | "MES";

// Las fechas de NotaGuardia/ProcederEjecutado son solo calendario (sin hora),
// guardadas como medianoche UTC. Todo el manejo de fechas de esta pantalla
// trabaja con el string "YYYY-MM-DD" y con Date locales construidos a mano
// (y/m/d), nunca con `new Date(isoConHoraUTC)` directo, porque en Uruguay
// (UTC-3) eso corre el día un dia para atrás al mostrarlo o compararlo.
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

function generarResumen(cliente: Cliente, eventos: Evento[], modo: Modo, ref: Date): string {
  const notas = eventos.filter((e): e is Extract<Evento, { tipo: "NOTA" }> => e.tipo === "NOTA");
  const procederes = eventos.filter((e): e is Extract<Evento, { tipo: "PROCEDER" }> => e.tipo === "PROCEDER");

  let texto = `Resumen de atención — ${cliente.nombrePaciente}\n${labelRango(modo, ref)}\n\n`;

  if (notas.length > 0) {
    texto += `📞 Consultas médicas (${notas.length})\n`;
    for (const n of notas) {
      texto += `• ${fechaCorta(n.fecha)} — ${TIPO_LLAMADA_LABELS[n.data.tipo]}: ${n.data.motivo}`;
      if (n.data.valoracion) texto += `. ${n.data.valoracion}`;
      if (n.data.derivoEmergencia) texto += ` ⚠️ Derivado a emergencia`;
      texto += `\n`;
    }
    texto += `\n`;
  }

  if (procederes.length > 0) {
    texto += `💉 Procederes de enfermería (${procederes.length})\n`;
    for (const p of procederes) {
      texto += `• ${fechaCorta(p.fecha)} — ${p.data.proceder} (${p.data.enfermero.nombre})`;
      if (p.data.notas) texto += `: ${p.data.notas}`;
      texto += `\n`;
    }
    texto += `\n`;
  }

  if (notas.length === 0 && procederes.length === 0) {
    texto += "Sin eventos registrados en este período.\n\n";
  }

  texto += `Cualquier consulta, quedamos a disposición.\nEquipo Vivam`;
  return texto;
}

export default function HistoriaClinicaPage() {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [notas, setNotas] = useState<NotaGuardia[]>([]);
  const [procederes, setProcederes] = useState<Proceder[]>([]);
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
    ]).then(([c, n, p]) => {
      setCliente(c);
      setNotas(Array.isArray(n) ? n : []);
      setProcederes(Array.isArray(p) ? p : []);
      setTelefono(telefonoSugerido(c?.contacto ?? null));
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
    return [...deNotas, ...deProcederes].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [notas, procederes, desde, hasta]);

  function abrirResumen() {
    if (!cliente) return;
    setResumen(generarResumen(cliente, eventos, modo, ref));
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
            rows={10}
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
            ) : (
              <div className="flex-1 text-sm">
                <span className="badge bg-teal/15 text-teal mr-2">Proceder de enfermería</span>
                <span className="font-semibold">{e.data.proceder}</span>
                <span className="text-navy/50"> · {e.data.enfermero.nombre}</span>
                {e.data.notas && <p className="mt-1">{e.data.notas}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
