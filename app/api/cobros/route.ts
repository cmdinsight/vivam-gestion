import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonth } from "@/lib/format";
import { calcularMontoPorHora, calcularProrateoPrimerMes } from "@/lib/planes";
import { marcarYSumarProcederesFacturados } from "@/lib/facturadores";
import { Prisma } from "@prisma/client";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes") || currentMonth();
  const cobros = await prisma.cobro.findMany({
    where: { mes },
    include: { cliente: true },
    orderBy: { fechaVencimiento: "asc" },
  });
  return NextResponse.json(cobros);
}

// Genera los cobros pendientes del mes para todos los clientes activos que
// todavía no tengan un cobro cargado para ese mes. Para clientes facturados
// "por hora" (sin plan), además recalcula el monto de los cobros PENDIENTE ya
// existentes a partir de sus turnos reales del mes (los ya cobrados/atrasados
// quedan fijos).
//
// En ambos casos (cobro nuevo o PENDIENTE existente, con plan o por hora) se
// suman los procederes fuera de cupo del cliente ese mes que todavía no se
// hubieran facturado — antes quedaban afuera del cálculo y había que
// agregarlos a mano. montoProcederes guarda esa parte aparte para poder
// recalcularla en cada corrida sin tocar el resto de montoEsperado (el plan
// mensual queda congelado desde que se crea el cobro; las horas, en cambio,
// se recalculan siempre desde los turnos reales). Un cobro ya
// COBRADO/ATRASADO no se toca, así que un proceder cargado después de
// cerrado el cobro del mes sigue quedando pendiente de facturar a mano (ver
// alertas.procederesSinFacturar en el dashboard).
export async function POST(req: NextRequest) {
  const { mes } = await req.json();
  const targetMes = mes || currentMonth();
  const [y, m] = targetMes.split("-").map(Number);

  const clientes = await prisma.cliente.findMany({ where: { estado: "ACTIVO" } });
  const existentes = await prisma.cobro.findMany({ where: { mes: targetMes } });
  const existentesMap = new Map(existentes.map((c) => [c.clienteId, c]));

  const nuevos = clientes.filter((c) => !existentesMap.has(c.id));
  for (const c of nuevos) {
    await prisma.$transaction(async (tx) => {
      const montoProcederes = await marcarYSumarProcederesFacturados(tx, c.id, targetMes);
      if (c.facturacion === "POR_HORA") {
        const { total } = await calcularMontoPorHora(c.id, targetMes);
        await tx.cobro.create({
          data: {
            clienteId: c.id,
            mes: targetMes,
            montoEsperado: D(total).add(montoProcederes),
            montoProcederes,
            fechaVencimiento: new Date(y, m - 1, 10),
            estado: "PENDIENTE",
            notas: null,
          },
        });
        return;
      }
      const prorateo = calcularProrateoPrimerMes(c.precioMensual, c.fechaInicio, targetMes);
      const base = prorateo ? D(prorateo.monto) : D(c.precioMensual);
      await tx.cobro.create({
        data: {
          clienteId: c.id,
          mes: targetMes,
          montoEsperado: base.add(montoProcederes),
          montoProcederes,
          fechaVencimiento: new Date(y, m - 1, 10),
          estado: "PENDIENTE",
          notas: prorateo
            ? `Prorrateado: primer mes de servicio, ${prorateo.diasUsados}/${prorateo.totalDias} días.`
            : null,
        },
      });
    });
  }

  const clientesMap = new Map(clientes.map((c) => [c.id, c]));
  for (const cobro of existentes) {
    if (cobro.estado !== "PENDIENTE") continue;
    const cliente = clientesMap.get(cobro.clienteId);
    if (!cliente) continue;
    await prisma.$transaction(async (tx) => {
      const montoProcederes = await marcarYSumarProcederesFacturados(tx, cobro.clienteId, targetMes);
      const montoBase =
        cliente.facturacion === "POR_HORA"
          ? D((await calcularMontoPorHora(cobro.clienteId, targetMes)).total)
          : // Congelado desde que se creó el cobro: se recupera restando lo que
            // ya tenía de procederes, en vez de recalcular el plan/prorrateo
            // de nuevo (que debe quedar fijo aunque cambie el precio de lista).
            D(cobro.montoEsperado).sub(cobro.montoProcederes);
      const nuevoMonto = montoBase.add(montoProcederes);
      if (!nuevoMonto.equals(cobro.montoEsperado) || !montoProcederes.equals(cobro.montoProcederes)) {
        await tx.cobro.update({
          where: { id: cobro.id },
          data: { montoEsperado: nuevoMonto, montoProcederes },
        });
      }
    });
  }

  const cobros = await prisma.cobro.findMany({
    where: { mes: targetMes },
    include: { cliente: true },
    orderBy: { fechaVencimiento: "asc" },
  });
  return NextResponse.json(cobros);
}
