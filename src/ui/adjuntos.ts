/**
 * Envío de mensajes con adjunto (foto, video o archivo).
 * Un enlace de WhatsApp solo lleva texto; para mandar un archivo se usa el
 * menú de compartir del teléfono (Web Share): ahí se elige WhatsApp y el
 * chat. El texto se copia también, por si la app no lo pega sola.
 */
import { useEffect, useState } from "react";
import { ID_FOTO, idArchivo, type Adjunto, type ClaveMensaje } from "../domain/ajustes";
import { biblioteca, useAjustes } from "../store/biblioteca";
import { sinEmojis } from "../domain/texto";

/** Carga el archivo adjunto de un mensaje (para poder compartirlo al instante). */
export function useArchivoAdjunto(clave: ClaveMensaje, adjunto: Adjunto | undefined): File | null {
  return useArchivo(idArchivo(clave), adjunto);
}

/** Tu foto de Configuración → Perfil (null si no hay). */
export function useFotoPerfil(): File | null {
  const a = useAjustes();
  return useArchivo(ID_FOTO, a?.perfil.foto);
}

/** Carga un archivo guardado en el dispositivo. */
export function useArchivo(id: string, adjunto: Adjunto | undefined): File | null {
  const [f, setF] = useState<File | null>(null);
  const firma = adjunto ? `${adjunto.nombre}|${adjunto.bytes}` : "";
  useEffect(() => {
    let vivo = true;
    if (!adjunto) {
      setF(null);
      return;
    }
    void biblioteca.archivo(id).then((b) => {
      if (vivo) setF(b ? new File([b], adjunto.nombre, { type: adjunto.tipo }) : null);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, firma]);
  return f;
}

export function puedeCompartir(f: File | null): boolean {
  try {
    return !!f && typeof navigator.share === "function" && !!navigator.canShare?.({ files: [f] });
  } catch {
    return false;
  }
}

export type ResultadoEnvio = "compartido" | "cancelado" | "descargado";

/** Comparte texto + archivo. Si el navegador no puede, copia el texto y descarga el archivo. */
export async function compartirConArchivo(texto0: string, f: File): Promise<ResultadoEnvio> {
  const texto = sinEmojis(texto0);
  try {
    await navigator.clipboard?.writeText(texto);
  } catch {
    /* sin portapapeles */
  }
  if (puedeCompartir(f)) {
    try {
      await navigator.share({ files: [f], text: texto });
      return "compartido";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelado";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(f);
  a.download = f.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "descargado";
}

export function iconoAdjunto(tipo: string): string {
  return tipo.startsWith("video/") ? "🎬" : tipo.startsWith("image/") ? "📷" : "📎";
}

/**
 * Foto lista para el PDF: JPEG cuadrado de hasta 320 px (data URL), recortada
 * al centro. null si no se puede leer la imagen.
 */
export async function fotoParaPDF(f: File | null): Promise<string | null> {
  if (!f) return null;
  try {
    const img = await createImageBitmap(f);
    const lado = Math.min(img.width, img.height);
    const t = Math.min(320, lado);
    const c = document.createElement("canvas");
    c.width = t;
    c.height = t;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, t, t);
    return c.toDataURL("image/jpeg", 0.88);
  } catch {
    return null;
  }
}
