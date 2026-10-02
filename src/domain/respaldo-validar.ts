/** Validación de un archivo de copia de seguridad (usa zod; se carga solo al importar). */
import { z } from "zod";
import { APP_RESPALDO, VERSION_RESPALDO } from "./respaldo";
import type { Argumento, Plan } from "./biblioteca";
import type { ContactoNuevo } from "./contactos";
import type { Ajustes } from "./ajustes";
import type { Prospecto } from "./tipos";

const ItemMin = z.object({ id: z.string().min(1), mod: z.number() }).passthrough();
const PlanMin = ItemMin.extend({ nombre: z.string() });
const ArgumentoMin = ItemMin.extend({ texto: z.string(), etiquetas: z.array(z.string()) });
const AjustesMin = ItemMin.extend({ id: z.literal("ajustes"), perfil: z.object({}).passthrough(), mensajes: z.object({}).passthrough() });
const ContactoMin = ItemMin.extend({ nombre: z.string(), celular: z.string(), correo: z.string() });

const FichaMin = z
  .object({
    id: z.string().min(1),
    tipo: z.enum(["nuevo", "cambio"]),
    creado: z.number(),
    mod: z.number(),
    etapa: z.string(),
  })
  .passthrough();

const RespaldoSchema = z.object({
  app: z.literal(APP_RESPALDO),
  version: z.number().int().min(1).max(VERSION_RESPALDO),
  fecha: z.number(),
  fichas: z.array(z.unknown()),
  planes: z.array(z.unknown()).optional(),
  argumentos: z.array(z.unknown()).optional(),
  contactos: z.array(z.unknown()).optional(),
  ajustes: z.array(z.unknown()).optional(),
});

export type LecturaRespaldo =
  | { ok: true; fichas: Prospecto[]; planes: Plan[]; argumentos: Argumento[]; contactos: ContactoNuevo[]; ajustes: Ajustes[]; descartadas: number; fecha: number }
  | { ok: false; error: string };

/** Valida un archivo de respaldo. Las fichas que no tienen la forma mínima se descartan. */
export function leerRespaldo(texto: string): LecturaRespaldo {
  let data: unknown;
  try {
    data = JSON.parse(texto);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }
  const r = RespaldoSchema.safeParse(data);
  if (!r.success) return { ok: false, error: "El archivo no es una copia de seguridad de esta app." };
  const fichas: Prospecto[] = [];
  let descartadas = 0;
  for (const f of r.data.fichas) {
    const v = FichaMin.safeParse(f);
    if (v.success) fichas.push(v.data as Prospecto);
    else descartadas++;
  }
  const validos = <T>(xs: unknown[] | undefined, esquema: z.ZodType): T[] =>
    (xs ?? []).flatMap((x) => {
      const v = esquema.safeParse(x);
      if (v.success) return [v.data as T];
      descartadas++;
      return [];
    });
  const planes = validos<Plan>(r.data.planes, PlanMin);
  const argumentos = validos<Argumento>(r.data.argumentos, ArgumentoMin);
  const contactos = validos<ContactoNuevo>(r.data.contactos, ContactoMin);
  const ajustes = validos<Ajustes>(r.data.ajustes, AjustesMin);
  return { ok: true, fichas, planes, argumentos, contactos, ajustes, descartadas, fecha: r.data.fecha };
}
