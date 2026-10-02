/** Sumar o quitar un plan recomendado de la propuesta (desde Plan recomendado o el pre-cierre). */
import { agregarProducto, quitarProducto } from "../domain/cierre";
import { nuevoId, txt } from "../domain/ficha";
import { valorUSD } from "../domain/oferta";
import { razones, type Recomendacion } from "../domain/recomendar";
import type { Prospecto } from "../domain/tipos";
import { biblioteca } from "../store/biblioteca";
import { useAviso } from "./hooks";

export function usePlanEnPropuesta(actualizar: (fn: (p: Prospecto) => Prospecto) => void) {
  const avisar = useAviso();
  /** `mensual`: el valor escrito para esa recomendación (o su precio de los documentos). */
  const usar = (r: Recomendacion, mensual: string) => {
    let plan = r.item.plan;
    // El plan leído de los PDF se guarda en Planes para poder elegirlo en el pre-cierre.
    if (r.item.virtual) {
      const ahora = Date.now();
      plan = { ...plan, id: nuevoId(ahora), creado: ahora, mod: ahora };
      void biblioteca.guardar("planes", plan);
    }
    const gana = razones(r).slice(0, 5).join("; ");
    // Se suma a los que ya eligió (no reemplaza): la propuesta puede llevar varios planes.
    actualizar((f) => agregarProducto({ ...f, ...(txt(f, "gana") ? {} : { gana }) }, plan, valorUSD(mensual)));
    avisar(`${plan.nombre} se sumó a la propuesta${r.item.virtual ? ", al pre-cierre y a tus Planes" : " y al pre-cierre"}`);
  };
  const quitar = (r: Recomendacion) => {
    actualizar((f) => quitarProducto(f, r.item.plan));
    avisar(`${r.item.plan.nombre} salió de la propuesta`);
  };
  return { usar, quitar };
}
