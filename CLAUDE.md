# CLAUDE.md · App "Tablero de prospectos · Asesoría de inversiones"

Brief del proyecto. Léelo antes de escribir código.

## 1. Qué es y para quién

Una app para **Bracho**, asesor **independiente** de inversiones en **Ecuador**, para registrar y analizar prospectos **desde el celular**. Ofrece **fondos unit linked de contribución regular** y **de contribución única**. Cobra comisión según el **tipo de plan y el plazo** (`src/config/comisiones.ts`).

Es una copia adaptada de `tablero-prospectos-saludsa`: comparte el núcleo (etapas, gamificación, CRM, Centro de Gestión, mensajes, referidos, copias de seguridad, uso 100 % local). `DECISIONES.md` viene de esa app: sus decisiones sobre el núcleo siguen valiendo; las de salud (preexistencias, escáner, coberturas, Vitality) ya no aplican.

## 2. Filosofía (no negociable)

- Ayudar a invertir **con criterio**: meta, plazo y perfil antes que producto.
- **Nunca prometer rendimientos.** Los rendimientos de un unit linked no están garantizados: se muestran escenarios, no promesas.
- La app puede decir **"aún no conviene"**: sin fondo de emergencia, con horizonte corto, o cuando mover el dinero cuesta más de lo que gana.
- Todo lo que dependa de la aseguradora emisora (costos, rescates, fondos, bonos) se marca **"validar con la aseguradora"**.

## 3. Tipos de ficha

| Tipo | Clave | Quién es |
|---|---|---|
| 🌱 Primera inversión | `nuevo` | Quiere empezar a ahorrar o invertir con un plan |
| 🔄 Ya invierte | `cambio` | Tiene ahorros o inversiones y no está conforme |

Las claves `nuevo` y `cambio` se conservan por compatibilidad con el núcleo.

## 4. Dónde está cada cosa

- Campos de la ficha, motivos y metas: `src/config/ficha.ts` (no cambiar la clave `k` de un campo existente).
- Análisis, veredicto y comparativo: `src/domain/analisis.ts`.
- Comisiones: `src/config/comisiones.ts` y `src/domain/comisiones.ts`.
- Informe de la primera reunión: `src/domain/informe.ts` y `src/ui/informePdf.ts`.
- Mensajes, objeciones, frases y posventa: `src/config/`.

## 5. Antes de subir cambios

`npm run typecheck`, `npm run lint`, `npm test` y `npm run e2e`.
