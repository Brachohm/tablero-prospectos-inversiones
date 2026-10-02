/**
 * Botones para contactar desde la ficha y la agenda:
 * - 📞 llama con saldo: abre el marcador del teléfono con el número listo.
 * - 💬 abre el chat de WhatsApp para escribir.
 * Al tocar cualquiera, el contacto se registra solo en el historial (con "Deshacer").
 *
 * Límite de los teléfonos: una página web no puede iniciar la llamada sola;
 * el marcador pide un toque para llamar.
 */
import { numeroWhatsApp, telefonoParaLlamar, txt } from "../domain/ficha";
import type { Prospecto } from "../domain/tipos";
import { useEnlaces, useRegistrar } from "./hooks";

export function BotonesContacto({ p }: { p: Prospecto }) {
  const enl = useEnlaces();
  const nombre = txt(p, "nombre") || "este prospecto";
  const tel = telefonoParaLlamar(p);
  const wa = numeroWhatsApp(p);
  const registrar = useRegistrar(p.id);
  if (!tel && !wa) return null;
  return (
    <>
      {wa && (
        <a
          className="contacto wa"
          {...enl.wa(wa)}
          rel="noopener noreferrer"
          aria-label={`Escribir por WhatsApp a ${nombre}`}
          onClick={() => registrar("WhatsApp", "", "Mensaje de WhatsApp")}
        >
          <span aria-hidden="true">💬</span>
        </a>
      )}
      {tel && (
        <a
          className="contacto llamar"
          href={"tel:" + tel}
          aria-label={`Llamar a ${nombre}`}
          onClick={() => registrar("Llamada", "", "Llamada")}
        >
          <span aria-hidden="true">📞</span>
        </a>
      )}
    </>
  );
}
