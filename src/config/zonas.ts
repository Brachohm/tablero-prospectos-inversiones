/**
 * Zonas del cuerpo y condiciones para la declaración de preexistencias.
 *
 * PROPUESTA EDITABLE: no es el formulario oficial de SaludSA. Cuando se tenga
 * el formulario oficial de declaración, reemplazar este archivo por ese listado.
 * Los ids de condición se guardan en las fichas: no cambiar un id existente,
 * solo agregar nuevos o cambiar su texto.
 */
import type { Zona } from "../domain/tipos";

export const ZONAS: readonly Zona[] = [
  {
    "id": "cabeza",
    "nombre": "Cabeza y mente",
    "icono": "🧠",
    "pista": "Piensa en golpes, convulsiones, migrañas y salud mental.",
    "grupos": [
      {
        "titulo": "Neurológico",
        "condiciones": [
          {
            "id": "cab_migr",
            "l": "Migrañas o dolores de cabeza crónicos"
          },
          {
            "id": "cab_epil",
            "l": "Epilepsia o convulsiones"
          },
          {
            "id": "cab_tce",
            "l": "Traumatismo craneoencefálico"
          },
          {
            "id": "cab_acv",
            "l": "Derrame o accidente cerebrovascular (ACV)"
          },
          {
            "id": "cab_tum",
            "l": "Tumor o quiste cerebral"
          },
          {
            "id": "cab_dem",
            "l": "Parkinson, Alzheimer u otra demencia"
          },
          {
            "id": "cab_em",
            "l": "Esclerosis múltiple u otra enfermedad desmielinizante"
          },
          {
            "id": "cab_aneu",
            "l": "Aneurisma o malformación vascular cerebral"
          },
          {
            "id": "cab_vert",
            "l": "Mareos o vértigo crónico"
          }
        ]
      },
      {
        "titulo": "Salud mental",
        "condiciones": [
          {
            "id": "men_dep",
            "l": "Depresión"
          },
          {
            "id": "men_ans",
            "l": "Ansiedad o ataques de pánico"
          },
          {
            "id": "men_bip",
            "l": "Trastorno bipolar"
          },
          {
            "id": "men_psi",
            "l": "Esquizofrenia u otro trastorno psicótico"
          },
          {
            "id": "men_tdah",
            "l": "TDAH"
          },
          {
            "id": "men_tea",
            "l": "Autismo (TEA) u otro trastorno del neurodesarrollo"
          },
          {
            "id": "men_tca",
            "l": "Trastorno de la conducta alimentaria"
          },
          {
            "id": "men_sust",
            "l": "Consumo problemático de alcohol o sustancias"
          },
          {
            "id": "men_ins",
            "l": "Insomnio crónico"
          }
        ]
      }
    ]
  },
  {
    "id": "ojos_orl",
    "nombre": "Ojos, oídos, nariz y boca",
    "icono": "👁️",
    "pista": "Visión, audición, respiración nasal, garganta y dientes.",
    "grupos": [
      {
        "titulo": "Ojos",
        "condiciones": [
          {
            "id": "oj_ref",
            "l": "Miopía, astigmatismo o hipermetropía altas"
          },
          {
            "id": "oj_cat",
            "l": "Cataratas"
          },
          {
            "id": "oj_glau",
            "l": "Glaucoma"
          },
          {
            "id": "oj_ret",
            "l": "Desprendimiento o enfermedad de retina"
          },
          {
            "id": "oj_quer",
            "l": "Queratocono"
          },
          {
            "id": "oj_estr",
            "l": "Estrabismo"
          },
          {
            "id": "oj_cir",
            "l": "Cirugía refractiva (láser)"
          }
        ]
      },
      {
        "titulo": "Oídos",
        "condiciones": [
          {
            "id": "oi_hip",
            "l": "Pérdida de audición"
          },
          {
            "id": "oi_otit",
            "l": "Otitis recurrente"
          },
          {
            "id": "oi_tin",
            "l": "Zumbidos (tinnitus)"
          },
          {
            "id": "oi_cir",
            "l": "Cirugía de oído o tubos de ventilación"
          }
        ]
      },
      {
        "titulo": "Nariz y garganta",
        "condiciones": [
          {
            "id": "na_sin",
            "l": "Sinusitis crónica o pólipos"
          },
          {
            "id": "na_tab",
            "l": "Desviación de tabique o cirugía nasal"
          },
          {
            "id": "na_rin",
            "l": "Rinitis alérgica"
          },
          {
            "id": "na_amig",
            "l": "Amigdalitis recurrente"
          },
          {
            "id": "na_voz",
            "l": "Problemas de cuerdas vocales"
          }
        ]
      },
      {
        "titulo": "Boca y dientes",
        "condiciones": [
          {
            "id": "bo_car",
            "l": "Caries o tratamientos dentales extensos"
          },
          {
            "id": "bo_enc",
            "l": "Enfermedad de encías"
          },
          {
            "id": "bo_orto",
            "l": "Ortodoncia en curso"
          },
          {
            "id": "bo_atm",
            "l": "Problemas de mandíbula (ATM)"
          },
          {
            "id": "bo_ter",
            "l": "Cirugía de muelas del juicio"
          }
        ]
      }
    ]
  },
  {
    "id": "cuello",
    "nombre": "Cuello y tiroides",
    "icono": "🦋",
    "pista": "Tiroides, nódulos y dolor cervical.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "cu_hipo",
            "l": "Hipotiroidismo"
          },
          {
            "id": "cu_hiper",
            "l": "Hipertiroidismo"
          },
          {
            "id": "cu_nod",
            "l": "Nódulos o bocio"
          },
          {
            "id": "cu_cat",
            "l": "Cáncer de tiroides"
          },
          {
            "id": "cu_cerv",
            "l": "Hernia discal o dolor cervical crónico"
          },
          {
            "id": "cu_gang",
            "l": "Ganglios inflamados recurrentes"
          },
          {
            "id": "cu_para",
            "l": "Enfermedad de paratiroides"
          }
        ]
      }
    ]
  },
  {
    "id": "pulmones",
    "nombre": "Pulmones",
    "icono": "🫁",
    "pista": "Respiración, tos crónica, infecciones y fumar.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "pu_asma",
            "l": "Asma"
          },
          {
            "id": "pu_epoc",
            "l": "EPOC o enfisema"
          },
          {
            "id": "pu_bron",
            "l": "Bronquitis crónica"
          },
          {
            "id": "pu_neu",
            "l": "Neumonías recurrentes"
          },
          {
            "id": "pu_tb",
            "l": "Tuberculosis (actual o previa)"
          },
          {
            "id": "pu_fib",
            "l": "Fibrosis pulmonar"
          },
          {
            "id": "pu_bq",
            "l": "Bronquiectasias"
          },
          {
            "id": "pu_apn",
            "l": "Apnea del sueño"
          },
          {
            "id": "pu_nmt",
            "l": "Neumotórax previo"
          },
          {
            "id": "pu_cov",
            "l": "Secuelas de COVID-19"
          },
          {
            "id": "pu_ca",
            "l": "Cáncer de pulmón"
          }
        ]
      }
    ]
  },
  {
    "id": "corazon",
    "nombre": "Corazón y circulación",
    "icono": "🫀",
    "pista": "Presión, ritmo, infartos, válvulas y cirugías del corazón.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "co_hta",
            "l": "Hipertensión arterial"
          },
          {
            "id": "co_arr",
            "l": "Arritmias o palpitaciones"
          },
          {
            "id": "co_inf",
            "l": "Infarto o enfermedad coronaria"
          },
          {
            "id": "co_ic",
            "l": "Insuficiencia cardíaca"
          },
          {
            "id": "co_val",
            "l": "Soplo o enfermedad de válvulas"
          },
          {
            "id": "co_cong",
            "l": "Cardiopatía congénita"
          },
          {
            "id": "co_dev",
            "l": "Marcapasos, stent o cirugía cardíaca"
          },
          {
            "id": "co_mio",
            "l": "Miocardiopatía"
          },
          {
            "id": "co_aor",
            "l": "Aneurisma de aorta"
          }
        ]
      }
    ]
  },
  {
    "id": "mamas",
    "nombre": "Mamas",
    "icono": "🎀",
    "pista": "Nódulos, biopsias, cirugías e implantes.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "ma_nod",
            "l": "Nódulos, quistes o fibroadenomas"
          },
          {
            "id": "ma_ca",
            "l": "Cáncer de mama"
          },
          {
            "id": "ma_bio",
            "l": "Mastectomía o biopsia"
          },
          {
            "id": "ma_imp",
            "l": "Implantes o cirugía estética de mamas"
          },
          {
            "id": "ma_masti",
            "l": "Mastitis recurrente"
          }
        ]
      },
      {
        "titulo": "Hombres",
        "sexo": "Hombre",
        "condiciones": [
          {
            "id": "ma_gine",
            "l": "Ginecomastia"
          }
        ]
      }
    ]
  },
  {
    "id": "abd_sup",
    "nombre": "Estómago, hígado y vesícula",
    "icono": "🍽️",
    "pista": "Gastritis, reflujo, vesícula, hígado y páncreas.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "ab_gas",
            "l": "Gastritis o úlcera"
          },
          {
            "id": "ab_erge",
            "l": "Reflujo (ERGE)"
          },
          {
            "id": "ab_hp",
            "l": "Infección por H. pylori"
          },
          {
            "id": "ab_hh",
            "l": "Hernia hiatal"
          },
          {
            "id": "ab_ves",
            "l": "Cálculos de vesícula o colecistectomía"
          },
          {
            "id": "ab_hig",
            "l": "Hígado graso"
          },
          {
            "id": "ab_hep",
            "l": "Hepatitis (A, B o C)"
          },
          {
            "id": "ab_cir",
            "l": "Cirrosis"
          },
          {
            "id": "ab_pan",
            "l": "Pancreatitis"
          },
          {
            "id": "ab_bar",
            "l": "Cirugía bariátrica"
          },
          {
            "id": "ab_ca",
            "l": "Cáncer de estómago, hígado o páncreas"
          }
        ]
      }
    ]
  },
  {
    "id": "renal",
    "nombre": "Riñones y vías urinarias",
    "icono": "💧",
    "pista": "Piedras, infecciones urinarias y función renal.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "re_calc",
            "l": "Cálculos renales (piedras)"
          },
          {
            "id": "re_itu",
            "l": "Infecciones urinarias recurrentes"
          },
          {
            "id": "re_ins",
            "l": "Insuficiencia renal o diálisis"
          },
          {
            "id": "re_quis",
            "l": "Quistes renales"
          },
          {
            "id": "re_refl",
            "l": "Reflujo vesicoureteral"
          },
          {
            "id": "re_inc",
            "l": "Incontinencia urinaria"
          },
          {
            "id": "re_hema",
            "l": "Sangre en la orina con estudio pendiente"
          },
          {
            "id": "re_ca",
            "l": "Cáncer de riñón o vejiga"
          },
          {
            "id": "re_tras",
            "l": "Trasplante renal"
          }
        ]
      }
    ]
  },
  {
    "id": "abd_inf",
    "nombre": "Intestinos y abdomen",
    "icono": "🌀",
    "pista": "Colon, apéndice, hernias y digestivo bajo.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "in_col",
            "l": "Colon irritable"
          },
          {
            "id": "in_cro",
            "l": "Colitis o enfermedad de Crohn"
          },
          {
            "id": "in_div",
            "l": "Divertículos"
          },
          {
            "id": "in_apen",
            "l": "Apendicitis (apendicectomía)"
          },
          {
            "id": "in_her",
            "l": "Hernias (inguinal, umbilical, etc.)"
          },
          {
            "id": "in_hem",
            "l": "Hemorroides o fisuras"
          },
          {
            "id": "in_cel",
            "l": "Enfermedad celíaca"
          },
          {
            "id": "in_pol",
            "l": "Pólipos de colon"
          },
          {
            "id": "in_est",
            "l": "Estreñimiento crónico severo"
          },
          {
            "id": "in_ca",
            "l": "Cáncer colorrectal"
          }
        ]
      }
    ]
  },
  {
    "id": "pelvis",
    "nombre": "Pelvis y aparato reproductor",
    "icono": "⚕️",
    "pista": "Ginecológico, próstata, fertilidad y embarazo.",
    "grupos": [
      {
        "titulo": "Mujeres",
        "sexo": "Mujer",
        "condiciones": [
          {
            "id": "pe_endo",
            "l": "Endometriosis"
          },
          {
            "id": "pe_ov",
            "l": "Quistes de ovario o síndrome de ovario poliquístico"
          },
          {
            "id": "pe_mio",
            "l": "Miomas"
          },
          {
            "id": "pe_ces",
            "l": "Cesáreas o partos complicados"
          },
          {
            "id": "pe_vph",
            "l": "VPH o displasia cervical"
          },
          {
            "id": "pe_ca",
            "l": "Cáncer de útero, cuello uterino u ovario"
          },
          {
            "id": "pe_emb",
            "l": "Embarazo actual"
          },
          {
            "id": "pe_his",
            "l": "Histerectomía o ligadura de trompas"
          },
          {
            "id": "pe_hor",
            "l": "Trastornos hormonales o menopausia"
          }
        ]
      },
      {
        "titulo": "Hombres",
        "sexo": "Hombre",
        "condiciones": [
          {
            "id": "pe_pros",
            "l": "Próstata agrandada o prostatitis"
          },
          {
            "id": "pe_vari",
            "l": "Varicocele"
          },
          {
            "id": "pe_cah",
            "l": "Cáncer de próstata o testículo"
          },
          {
            "id": "pe_fim",
            "l": "Fimosis o circuncisión"
          },
          {
            "id": "pe_vas",
            "l": "Vasectomía"
          }
        ]
      },
      {
        "titulo": "Ambos",
        "condiciones": [
          {
            "id": "pe_inf",
            "l": "Infertilidad"
          },
          {
            "id": "pe_its",
            "l": "Infecciones de transmisión sexual"
          },
          {
            "id": "pe_dis",
            "l": "Disfunción sexual"
          }
        ]
      }
    ]
  },
  {
    "id": "columna",
    "nombre": "Columna y espalda",
    "icono": "🦴",
    "pista": "Dolor de espalda, hernias, escoliosis y cirugías.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "cl_hern",
            "l": "Hernia discal (lumbar o dorsal)"
          },
          {
            "id": "cl_esc",
            "l": "Escoliosis"
          },
          {
            "id": "cl_lumb",
            "l": "Dolor lumbar crónico"
          },
          {
            "id": "cl_cif",
            "l": "Cifosis"
          },
          {
            "id": "cl_art",
            "l": "Artrosis o espondilitis"
          },
          {
            "id": "cl_frac",
            "l": "Fractura vertebral"
          },
          {
            "id": "cl_cir",
            "l": "Cirugía de columna"
          },
          {
            "id": "cl_est",
            "l": "Estenosis de canal"
          }
        ]
      }
    ]
  },
  {
    "id": "brazos",
    "nombre": "Hombros, brazos y manos",
    "icono": "💪",
    "pista": "Lesiones, tendinitis, fracturas y articulaciones.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "br_hom",
            "l": "Lesión de hombro (manguito, luxación)"
          },
          {
            "id": "br_ten",
            "l": "Tendinitis o epicondilitis (codo)"
          },
          {
            "id": "br_tun",
            "l": "Síndrome del túnel carpiano"
          },
          {
            "id": "br_frac",
            "l": "Fracturas de brazo, muñeca o mano"
          },
          {
            "id": "br_art",
            "l": "Artritis o artrosis en manos"
          },
          {
            "id": "br_amp",
            "l": "Amputación o malformación"
          }
        ]
      }
    ]
  },
  {
    "id": "caderas",
    "nombre": "Caderas",
    "icono": "🔩",
    "pista": "Desgaste, prótesis y fracturas.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "ca_art",
            "l": "Artrosis de cadera"
          },
          {
            "id": "ca_disp",
            "l": "Displasia de cadera"
          },
          {
            "id": "ca_prot",
            "l": "Prótesis de cadera"
          },
          {
            "id": "ca_frac",
            "l": "Fractura de cadera o pelvis"
          },
          {
            "id": "ca_burs",
            "l": "Bursitis o tendinitis de cadera"
          }
        ]
      }
    ]
  },
  {
    "id": "piernas",
    "nombre": "Rodillas y piernas",
    "icono": "🦵",
    "pista": "Ligamentos, menisco, várices y trombosis.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "pi_lig",
            "l": "Lesión de ligamentos o menisco"
          },
          {
            "id": "pi_art",
            "l": "Artrosis de rodilla"
          },
          {
            "id": "pi_prot",
            "l": "Prótesis de rodilla"
          },
          {
            "id": "pi_var",
            "l": "Várices o insuficiencia venosa"
          },
          {
            "id": "pi_trom",
            "l": "Trombosis venosa profunda"
          },
          {
            "id": "pi_frac",
            "l": "Fracturas de pierna"
          },
          {
            "id": "pi_ten",
            "l": "Tendinitis"
          },
          {
            "id": "pi_ulc",
            "l": "Úlceras en las piernas"
          }
        ]
      }
    ]
  },
  {
    "id": "pies",
    "nombre": "Tobillos y pies",
    "icono": "🦶",
    "pista": "Esguinces, fascitis, juanetes y pie diabético.",
    "grupos": [
      {
        "titulo": "",
        "condiciones": [
          {
            "id": "pv_esg",
            "l": "Esguinces recurrentes"
          },
          {
            "id": "pv_fas",
            "l": "Fascitis plantar o espolón"
          },
          {
            "id": "pv_jun",
            "l": "Juanetes"
          },
          {
            "id": "pv_pl",
            "l": "Pie plano o cavo"
          },
          {
            "id": "pv_diab",
            "l": "Pie diabético o úlceras"
          },
          {
            "id": "pv_frac",
            "l": "Fracturas de tobillo o pie"
          },
          {
            "id": "pv_gota",
            "l": "Gota"
          },
          {
            "id": "pv_aq",
            "l": "Lesión del tendón de Aquiles"
          }
        ]
      }
    ]
  },
  {
    "id": "sistemico",
    "nombre": "Todo el cuerpo",
    "icono": "🧬",
    "pista": "Lo que no pertenece a una sola zona: metabólico, sangre, inmunidad, piel y cirugías.",
    "grupos": [
      {
        "titulo": "Metabólico y endocrino",
        "condiciones": [
          {
            "id": "si_dm",
            "l": "Diabetes"
          },
          {
            "id": "si_col",
            "l": "Colesterol o triglicéridos altos"
          },
          {
            "id": "si_obe",
            "l": "Obesidad"
          },
          {
            "id": "si_osteo",
            "l": "Osteoporosis"
          },
          {
            "id": "si_hor",
            "l": "Otro trastorno hormonal"
          }
        ]
      },
      {
        "titulo": "Cáncer y sangre",
        "condiciones": [
          {
            "id": "si_ca",
            "l": "Cáncer en cualquier localización (actual o previo)"
          },
          {
            "id": "si_sang",
            "l": "Trastornos de la sangre (anemia, hemofilia, etc.)"
          },
          {
            "id": "si_trom",
            "l": "Trombofilia o uso de anticoagulantes"
          }
        ]
      },
      {
        "titulo": "Inmunidad e infecciones",
        "condiciones": [
          {
            "id": "si_auto",
            "l": "Enfermedad autoinmune (lupus, artritis reumatoide, etc.)"
          },
          {
            "id": "si_aler",
            "l": "Alergias severas o anafilaxia"
          },
          {
            "id": "si_inf",
            "l": "Infecciones crónicas (hepatitis, VIH, tuberculosis)"
          }
        ]
      },
      {
        "titulo": "Piel",
        "condiciones": [
          {
            "id": "si_pso",
            "l": "Psoriasis o dermatitis crónica"
          },
          {
            "id": "si_lun",
            "l": "Lunares o lesiones en seguimiento"
          },
          {
            "id": "si_mel",
            "l": "Cáncer de piel"
          }
        ]
      },
      {
        "titulo": "General",
        "condiciones": [
          {
            "id": "si_cir",
            "l": "Cirugías previas no mencionadas"
          },
          {
            "id": "si_hosp",
            "l": "Hospitalizaciones en los últimos 5 años"
          },
          {
            "id": "si_med",
            "l": "Medicación de uso permanente"
          },
          {
            "id": "si_disc",
            "l": "Discapacidad o secuelas"
          }
        ]
      }
    ]
  }
];

export const ESTADOS_CONDICION = ["En tratamiento", "En estudio", "Controlado", "Resuelto"] as const;
export const ROLES_PERSONA = ["Pareja", "Hijo(a)", "Padre o madre", "Otro"] as const;
