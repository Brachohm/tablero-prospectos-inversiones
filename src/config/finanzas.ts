/** Rangos para la foto financiera del prospecto. Editables. */

/** Rangos de ingreso mensual neto del hogar y su valor de referencia (punto medio). */
export const RANGOS_INGRESO: readonly { l: string; v: number }[] = [
  { l: "Menos de $500", v: 400 },
  { l: "$500 a $1.000", v: 750 },
  { l: "$1.000 a $2.000", v: 1500 },
  { l: "$2.000 a $3.500", v: 2750 },
  { l: "$3.500 a $5.000", v: 4250 },
  { l: "Más de $5.000", v: 6000 },
];
