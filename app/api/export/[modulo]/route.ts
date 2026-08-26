import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { PLAN_LABELS, MODALIDAD_LABELS, FACTURACION_LABELS, ESTADO_CLIENTE_LABELS, ESTADO_COBRO_LABELS, dateInput } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { modulo: string } }) {
  const mes = req.nextUrl.searchParams.get("mes") || undefined;

  switch (params.modulo) {
    case "clientes": {
      const clientes = await prisma.cliente.findMany({ orderBy: { nombrePaciente: "asc" } });
      const rows = clientes.map((c) => ({
        Paciente: c.nombrePaciente,
        Familia: c.familiaResponsable,
        Contacto: c.contacto,
        Zona: c.zona,
        Facturacion: FACTURACION_LABELS[c.facturacion],
        Plan: c.plan ? PLAN_LABELS[c.plan] : "",
        FechaInicio: dateInput(c.fechaInicio),
        Modalidad: c.modalidad ? MODALIDAD_LABELS[c.modalidad] : "",
        PrecioMensual: c.facturacion === "POR_HORA" ? "Según turnos" : c.precioMensual.toString(),
        Estado: ESTADO_CLIENTE_LABELS[c.estado],
      }));
      const csv = toCsv(rows, Object.keys(rows[0] ?? { Paciente: "" }));
      return csvResponse("clientes.csv", csv);
    }
    case "cobros": {
      const cobros = await prisma.cobro.findMany({
        where: mes ? { mes } : undefined,
        include: { cliente: true },
        orderBy: { mes: "desc" },
      });
      const rows = cobros.map((c) => ({
        Mes: c.mes,
        Paciente: c.cliente.nombrePaciente,
        Familia: c.cliente.familiaResponsable,
        MontoEsperado: c.montoEsperado.toString(),
        Vencimiento: dateInput(c.fechaVencimiento),
        Estado: ESTADO_COBRO_LABELS[c.estado],
        MontoCobrado: c.montoCobrado?.toString() ?? "",
        FechaCobro: dateInput(c.fechaCobro),
      }));
      const csv = toCsv(rows, Object.keys(rows[0] ?? { Mes: "" }));
      return csvResponse(`cobros${mes ? "_" + mes : ""}.csv`, csv);
    }
    case "trabajadores": {
      const trabajadores = await prisma.trabajador.findMany({ orderBy: { nombre: "asc" } });
      const rows = trabajadores.map((t) => ({
        Nombre: t.nombre,
        Contacto: t.contacto,
        FechaIngreso: dateInput(t.fechaIngreso),
        Categoria: t.categoriaLaboral,
        TipoTarifa: t.tipoTarifa,
        Tarifa: t.tipoTarifa === "HORA" ? "Según turno (tarifa fija config.)" : t.tarifa.toString(),
        CuentaBancaria: t.cuentaBancaria,
        Estado: t.estado,
      }));
      const csv = toCsv(rows, Object.keys(rows[0] ?? { Nombre: "" }));
      return csvResponse("trabajadores.csv", csv);
    }
    case "liquidaciones": {
      const liquidaciones = await prisma.liquidacionMensual.findMany({
        where: mes ? { mes } : undefined,
        include: { trabajador: true },
        orderBy: { mes: "desc" },
      });
      const rows = liquidaciones.map((l) => ({
        Mes: l.mes,
        Cuidador: l.trabajador.nombre,
        HorasTotales: l.horasTotales.toString(),
        SueldoNominal: l.sueldoNominal.toString(),
        BpsPatronal: l.bpsPatronal.toString(),
        Bse: l.bse.toString(),
        ProvisionAguinaldo: l.aguinaldoProvision.toString(),
        ProvisionLicencia: l.licenciaProvision.toString(),
      }));
      const csv = toCsv(rows, Object.keys(rows[0] ?? { Mes: "" }));
      return csvResponse(`liquidaciones${mes ? "_" + mes : ""}.csv`, csv);
    }
    case "turnos": {
      const turnos = await prisma.turno.findMany({
        where: mes ? { mes } : undefined,
        include: { trabajador: true, cliente: true },
        orderBy: { fecha: "desc" },
      });
      const rows = turnos.map((t) => ({
        Fecha: dateInput(t.fecha),
        Cuidador: t.trabajador.nombre,
        Cliente: t.cliente?.nombrePaciente ?? "",
        HoraInicio: t.horaInicio,
        HoraFin: t.horaFin,
        Horas: t.horas.toString(),
        Estado: t.estado,
        Editado: t.editado ? "Si" : "No",
        Motivo: t.motivo ?? "",
      }));
      const csv = toCsv(rows, Object.keys(rows[0] ?? { Fecha: "" }));
      return csvResponse(`turnos${mes ? "_" + mes : ""}.csv`, csv);
    }
    case "movimientos": {
      const movimientos = await prisma.movimientoProvision.findMany({
        include: { trabajador: true },
        orderBy: { fecha: "desc" },
      });
      const rows = movimientos.map((mv) => ({
        Fecha: dateInput(mv.fecha),
        Cuidador: mv.trabajador.nombre,
        Tipo: mv.tipo,
        Mes: mv.mes,
        Monto: mv.monto.toString(),
        EsPago: mv.esPago ? "Si" : "No",
        Descripcion: mv.descripcion,
      }));
      const csv = toCsv(rows, Object.keys(rows[0] ?? { Fecha: "" }));
      return csvResponse("movimientos_provision.csv", csv);
    }
    default:
      return NextResponse.json({ error: "Módulo desconocido" }, { status: 400 });
  }
}
