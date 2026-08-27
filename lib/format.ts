export function money(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function num(value: number | string | null | undefined, decimals = 2): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: decimals,
  }).format(n || 0);
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-UY", { month: "long", year: "numeric" });
}

export function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function dateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export const PLAN_LABELS: Record<string, string> = {
  ESENCIAL_LUNES_VIERNES: "Esencial Lun-Vie",
  ESENCIAL_COMPLETO: "Esencial Completo",
  EXTENDIDO: "Extendido",
  INTEGRAL: "Integral",
  VIVAM_NOCTURNO: "Vivam Nocturno",
};

export const MODALIDAD_LABELS: Record<string, string> = {
  MENSUAL: "Mensual",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

export const UNIDAD_LABELS: Record<string, string> = {
  POR_VISITA: "Por visita",
  POR_MES: "Por mes",
};

export const FACTURACION_LABELS: Record<string, string> = {
  PLAN_MENSUAL: "Plan mensual",
  POR_HORA: "Por hora (sin plan)",
};

export const ESTADO_CLIENTE_LABELS: Record<string, string> = {
  PROSPECTO: "Prospecto",
  ACTIVO: "Activo",
  PAUSADO: "Pausado",
  BAJA: "Baja",
};

export const ESTADO_COBRO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  COBRADO: "Cobrado",
  ATRASADO: "Atrasado",
};

export const ROL_PROFESIONAL_LABELS: Record<string, string> = {
  MEDICO: "Médico",
  ENFERMERO: "Enfermero",
};

export const TIPO_LLAMADA_LABELS: Record<string, string> = {
  PROGRAMADA: "Consulta programada",
  GUARDIA: "Consulta de guardia",
  EMERGENCIA: "Emergencia",
};

export const QUIEN_LLAMA_LABELS: Record<string, string> = {
  CUIDADOR: "Cuidador",
  ENFERMERO: "Enfermero",
  FAMILIAR: "Familiar",
};

/** true si el seguro de RC profesional está vencido o sin cargar. */
export function seguroVencido(fecha: string | Date | null | undefined): boolean {
  if (!fecha) return true;
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.getTime() < Date.now();
}
