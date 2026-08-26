"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { money, num, currentMonth, monthLabel, shiftMonth, dateInput } from "@/lib/format";
import CalendarGrid from "@/components/CalendarGrid";

type Trabajador = {
  id: string;
  nombre: string;
  contacto: string | null;
  fechaIngreso: string;
  categoriaLaboral: string | null;
  tipoTarifa: string;
  tarifa: string;
  cuentaBancaria: string | null;
  diasLicenciaAnualesOverride: number | null;
  proximaFechaLicenciaEstimada: string | null;
  estado: string;
  notas: string | null;
};

type Cliente = { id: string; nombrePaciente: string };

type TurnoT = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  horas: string;
  estado: string;
  motivo: string | null;
  editado: boolean;
  origenManual: boolean;
  cliente: { nombrePaciente: string } | null;
};

type Resumen = {
  calculo: {
    horasTotales: string;
    sueldoNominal: string;
    bpsPatronal: string;
    bse: string;
    aguinaldoProvision: string;
    licenciaProvision: string;
    cargasCorrientes: string;
    costoTotalMes: string;
  };
  procesado: boolean;
  turnos: TurnoT[];
  saldoAguinaldo: string;
  saldoLicencia: string;
  movimientos: { id: string; tipo: string; mes: string; monto: string; esPago: boolean; descripcion: string | null; fecha: string }[];
};

const ESTADO_TURNO_LABELS: Record<string, string> = {
  PROGRAMADO: "Programado",
  TRABAJADO: "Trabajado",
  NO_TRABAJADO: "No trabajado",
};

export default function TrabajadorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mes, setMes] = useState(currentMonth());
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    fecha: dateInput(new Date()),
    horaInicio: "08:00",
    horaFin: "16:00",
    clienteId: "",
  });

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ horaInicio: "", horaFin: "", estado: "PROGRAMADO", motivo: "" });

  function loadTrabajador() {
    fetch(`/api/trabajadores/${id}`)
      .then((r) => r.json())
      .then(setTrabajador);
  }

  function loadResumen() {
    setLoading(true);
    fetch(`/api/trabajadores/${id}/resumen?mes=${mes}`)
      .then((r) => r.json())
      .then((d) => {
        setResumen(d);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadTrabajador();
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((d) => setClientes(d.filter((c: { estado: string }) => c.estado === "ACTIVO")));
  }, [id]);

  useEffect(loadResumen, [id, mes]);

  async function agregarManual(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trabajadorId: id, ...manualForm, clienteId: manualForm.clienteId || null }),
    });
    if (!res.ok) {
      const d = await res.json();
      setMsg(d.error);
      return;
    }
    setShowManual(false);
    loadResumen();
  }

  function empezarEdicion(t: TurnoT) {
    setEditandoId(t.id);
    setEditForm({ horaInicio: t.horaInicio, horaFin: t.horaFin, estado: t.estado, motivo: t.motivo || "" });
  }

  async function guardarEdicion() {
    await fetch(`/api/turnos/${editandoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditandoId(null);
    loadResumen();
  }

  async function eliminarTurno(turnoId: string) {
    if (!confirm("¿Eliminar este turno?")) return;
    await fetch(`/api/turnos/${turnoId}`, { method: "DELETE" });
    loadResumen();
  }

  async function procesarMes() {
    setMsg("");
    const res = await fetch("/api/liquidacion/procesar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trabajadorId: id, mes }),
    });
    if (!res.ok) {
      const d = await res.json();
      setMsg(d.error);
      return;
    }
    loadResumen();
  }

  async function pagar(tipo: "AGUINALDO" | "LICENCIA") {
    setMsg("");
    const res = await fetch("/api/liquidacion/pagar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trabajadorId: id, tipo }),
    });
    if (!res.ok) {
      const d = await res.json();
      setMsg(d.error);
      return;
    }
    loadResumen();
  }

  async function guardarDatos(e: React.FormEvent) {
    e.preventDefault();
    if (!trabajador) return;
    await fetch(`/api/trabajadores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...trabajador, tarifa: parseFloat(trabajador.tarifa) }),
    });
    setMsg("Datos guardados.");
  }

  if (!trabajador) return <p className="text-navy/60">Cargando…</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">{trabajador.nombre}</h1>
      {msg && <p className="text-sm text-teal">{msg}</p>}

      <form onSubmit={guardarDatos} className="card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Contacto</label>
          <input
            className="input"
            value={trabajador.contacto || ""}
            onChange={(e) => setTrabajador({ ...trabajador, contacto: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Categoría laboral</label>
          <input
            className="input"
            value={trabajador.categoriaLaboral || ""}
            onChange={(e) => setTrabajador({ ...trabajador, categoriaLaboral: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Cuenta bancaria</label>
          <input
            className="input"
            value={trabajador.cuentaBancaria || ""}
            onChange={(e) => setTrabajador({ ...trabajador, cuentaBancaria: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Tipo de tarifa</label>
          <select
            className="input"
            value={trabajador.tipoTarifa}
            onChange={(e) => setTrabajador({ ...trabajador, tipoTarifa: e.target.value })}
          >
            <option value="HORA">Por hora</option>
            <option value="MENSUAL">Mensual fijo</option>
          </select>
        </div>
        {trabajador.tipoTarifa === "MENSUAL" ? (
          <div>
            <label className="label">Tarifa ($/mes)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={trabajador.tarifa}
              onChange={(e) => setTrabajador({ ...trabajador, tarifa: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <label className="label">Tarifa</label>
            <p className="text-sm text-navy/50 pt-2">
              Tarifa fija diurna/nocturna por turno (Configuración), no se edita por cuidador.
            </p>
          </div>
        )}
        <div>
          <label className="label">Estado</label>
          <select
            className="input"
            value={trabajador.estado}
            onChange={(e) => setTrabajador({ ...trabajador, estado: e.target.value })}
          >
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
        <div>
          <label className="label">Días de licencia/año (override, opcional)</label>
          <input
            className="input"
            type="number"
            value={trabajador.diasLicenciaAnualesOverride ?? ""}
            placeholder="Usa el valor global"
            onChange={(e) =>
              setTrabajador({
                ...trabajador,
                diasLicenciaAnualesOverride: e.target.value ? parseInt(e.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <label className="label">Próxima fecha de licencia estimada</label>
          <input
            className="input"
            type="date"
            value={dateInput(trabajador.proximaFechaLicenciaEstimada)}
            onChange={(e) => setTrabajador({ ...trabajador, proximaFechaLicenciaEstimada: e.target.value || null })}
          />
        </div>
        <div className="sm:col-span-3">
          <button className="btn-primary" type="submit">
            Guardar datos
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 text-sm">
        <button className="btn-ghost px-2 py-1" onClick={() => setMes(shiftMonth(mes, -1))}>
          ←
        </button>
        <span className="font-semibold capitalize w-36 text-center">{monthLabel(mes)}</span>
        <button className="btn-ghost px-2 py-1" onClick={() => setMes(shiftMonth(mes, 1))}>
          →
        </button>
      </div>

      {loading || !resumen ? (
        <p className="text-navy/60">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="label">Horas del mes</p>
              <p className="font-display text-xl">{num(resumen.calculo.horasTotales)}</p>
            </div>
            <div className="card p-4">
              <p className="label">Sueldo nominal</p>
              <p className="font-display text-xl">{money(resumen.calculo.sueldoNominal)}</p>
            </div>
            <div className="card p-4">
              <p className="label">Cargas (BPS+BSE)</p>
              <p className="font-display text-xl">{money(resumen.calculo.cargasCorrientes)}</p>
            </div>
            <div className="card p-4">
              <p className="label">Costo total del mes</p>
              <p className="font-display text-xl text-navy">{money(resumen.calculo.costoTotalMes)}</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-lg">Cierre del mes</h2>
              {resumen.procesado ? (
                <span className="badge bg-teal/15 text-teal">Mes procesado</span>
              ) : (
                <button className="btn-accent text-sm" onClick={procesarMes}>
                  Procesar {monthLabel(mes)}
                </button>
              )}
            </div>
            <p className="text-sm text-navy/60">
              Al procesar el mes se acredita la provisión de aguinaldo ({money(resumen.calculo.aguinaldoProvision)}) y
              licencia + salario vacacional ({money(resumen.calculo.licenciaProvision)}) al saldo acumulado del
              cuidador. Es una acción única por mes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="label">Saldo acumulado de aguinaldo</p>
              <p className="font-display text-2xl text-champagne mb-3">{money(resumen.saldoAguinaldo)}</p>
              <button
                className="btn-ghost text-sm"
                disabled={parseFloat(resumen.saldoAguinaldo) <= 0}
                onClick={() => pagar("AGUINALDO")}
              >
                Registrar pago de aguinaldo
              </button>
            </div>
            <div className="card p-5">
              <p className="label">Saldo acumulado de licencia + sal. vacacional</p>
              <p className="font-display text-2xl text-champagne mb-3">{money(resumen.saldoLicencia)}</p>
              <button
                className="btn-ghost text-sm"
                disabled={parseFloat(resumen.saldoLicencia) <= 0}
                onClick={() => pagar("LICENCIA")}
              >
                Registrar pago de licencia
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-lg mb-3">Calendario de turnos</h2>
            <CalendarGrid
              mes={mes}
              renderDay={(fecha) => {
                const delDia = resumen.turnos.filter((t) => t.fecha.slice(0, 10) === dateInput(fecha));
                return (
                  <div className="space-y-0.5">
                    {delDia.map((t) => (
                      <div
                        key={t.id}
                        className={`truncate rounded px-1 ${
                          t.estado === "NO_TRABAJADO"
                            ? "bg-red-100 text-red-600 line-through"
                            : t.editado
                            ? "bg-champagne/20 text-champagne"
                            : "bg-teal/15 text-teal"
                        }`}
                        title={`${t.cliente?.nombrePaciente ?? "—"} ${t.horaInicio}-${t.horaFin}`}
                      >
                        {t.cliente?.nombrePaciente?.split(" ")[0] ?? "—"}
                      </div>
                    ))}
                  </div>
                );
              }}
            />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg">Turnos del mes (detalle)</h2>
              <div className="flex gap-2">
                <a href={`/api/export/turnos?mes=${mes}`} className="btn-ghost text-sm">
                  Exportar CSV
                </a>
                {!resumen.procesado && (
                  <button className="btn-ghost text-sm" onClick={() => setShowManual(!showManual)}>
                    + Turno manual
                  </button>
                )}
              </div>
            </div>

            {showManual && (
              <form onSubmit={agregarManual} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end mb-4 border-b border-navy/10 pb-4">
                <div>
                  <label className="label">Fecha</label>
                  <input
                    className="input"
                    type="date"
                    required
                    value={manualForm.fecha}
                    onChange={(e) => setManualForm({ ...manualForm, fecha: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Hora inicio</label>
                  <input
                    className="input"
                    type="time"
                    required
                    value={manualForm.horaInicio}
                    onChange={(e) => setManualForm({ ...manualForm, horaInicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Hora fin</label>
                  <input
                    className="input"
                    type="time"
                    required
                    value={manualForm.horaFin}
                    onChange={(e) => setManualForm({ ...manualForm, horaFin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Cliente</label>
                  <select
                    className="input"
                    value={manualForm.clienteId}
                    onChange={(e) => setManualForm({ ...manualForm, clienteId: e.target.value })}
                  >
                    <option value="">—</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombrePaciente}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn-primary" type="submit">
                  Agregar
                </button>
              </form>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-navy/10 text-navy/60">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Horario</th>
                  <th className="p-2">Horas</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {resumen.turnos.map((t) =>
                  editandoId === t.id ? (
                    <tr key={t.id} className="border-b border-navy/5 bg-navy/[0.02]">
                      <td className="p-2">{new Date(t.fecha).toLocaleDateString("es-UY")}</td>
                      <td className="p-2">{t.cliente?.nombrePaciente ?? "—"}</td>
                      <td className="p-2 flex gap-1">
                        <input
                          className="input"
                          type="time"
                          value={editForm.horaInicio}
                          onChange={(e) => setEditForm({ ...editForm, horaInicio: e.target.value })}
                        />
                        <input
                          className="input"
                          type="time"
                          value={editForm.horaFin}
                          onChange={(e) => setEditForm({ ...editForm, horaFin: e.target.value })}
                        />
                      </td>
                      <td className="p-2 text-navy/40">—</td>
                      <td className="p-2">
                        <select
                          className="input"
                          value={editForm.estado}
                          onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                        >
                          <option value="PROGRAMADO">Programado</option>
                          <option value="TRABAJADO">Trabajado</option>
                          <option value="NO_TRABAJADO">No trabajado</option>
                        </select>
                        {editForm.estado === "NO_TRABAJADO" && (
                          <input
                            className="input mt-1"
                            placeholder="Motivo (opcional)"
                            value={editForm.motivo}
                            onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
                          />
                        )}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <button className="text-teal hover:underline mr-2" onClick={guardarEdicion}>
                          Guardar
                        </button>
                        <button className="text-navy/50 hover:underline" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id} className="border-b border-navy/5">
                      <td className="p-2">{new Date(t.fecha).toLocaleDateString("es-UY")}</td>
                      <td className="p-2">{t.cliente?.nombrePaciente ?? "—"}</td>
                      <td className="p-2">
                        {t.horaInicio} - {t.horaFin}
                      </td>
                      <td className="p-2">{num(t.horas)}</td>
                      <td className="p-2">
                        <span
                          className={`badge ${
                            t.estado === "NO_TRABAJADO"
                              ? "bg-red-100 text-red-600"
                              : t.editado
                              ? "bg-champagne/20 text-champagne"
                              : "bg-teal/15 text-teal"
                          }`}
                        >
                          {ESTADO_TURNO_LABELS[t.estado]}
                          {t.editado ? " · editado" : ""}
                        </span>
                        {t.motivo && <p className="text-xs text-navy/50 mt-0.5">{t.motivo}</p>}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {!resumen.procesado && (
                          <>
                            <button className="text-teal hover:underline mr-3" onClick={() => empezarEdicion(t)}>
                              Editar
                            </button>
                            <button className="text-red-500 hover:underline" onClick={() => eliminarTurno(t.id)}>
                              Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                )}
                {resumen.turnos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-navy/50">
                      Sin turnos este mes. Se generan solos si el cuidador tiene una asignación fija, o agregalos
                      manualmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-lg mb-3">Movimientos de provisión (últimos)</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-navy/10 text-navy/60">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Mes</th>
                  <th className="p-2">Monto</th>
                  <th className="p-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {resumen.movimientos.map((m) => (
                  <tr key={m.id} className="border-b border-navy/5">
                    <td className="p-2">{new Date(m.fecha).toLocaleDateString("es-UY")}</td>
                    <td className="p-2">{m.tipo === "AGUINALDO" ? "Aguinaldo" : "Licencia"}</td>
                    <td className="p-2">{m.mes}</td>
                    <td className={`p-2 ${m.esPago ? "text-red-600" : "text-teal"}`}>{money(m.monto)}</td>
                    <td className="p-2 text-navy/60">{m.descripcion}</td>
                  </tr>
                ))}
                {resumen.movimientos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-navy/50">
                      Sin movimientos todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
