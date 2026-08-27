"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ValoracionForm from "@/components/ValoracionForm";

type Cliente = { id: string; nombrePaciente: string };
type Medico = { id: string; nombre: string };

export default function ValoracionAdminPage() {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  useEffect(() => {
    fetch(`/api/clientes/${id}`)
      .then((r) => r.json())
      .then(setCliente);
    fetch("/api/profesionales?rol=MEDICO")
      .then((r) => r.json())
      .then((d) => setMedicos(Array.isArray(d) ? d : []));
  }, [id]);

  if (!cliente) return <p className="text-navy/60">Cargando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/clientes/${id}`} className="text-sm text-teal hover:underline">
          ← {cliente.nombrePaciente}
        </Link>
        <h1 className="font-display text-2xl mt-1">Ficha médica — Valoración inicial</h1>
      </div>

      <ValoracionForm
        clienteId={id}
        cargarUrl={`/api/clientes/${id}/valoracion`}
        guardarUrl={`/api/clientes/${id}/valoracion`}
        guardarMetodo="PUT"
        medicos={medicos}
      />
    </div>
  );
}
