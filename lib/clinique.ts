// Aide clinique : professions, alertes sur les constantes et hypothèses diagnostiques.
// Ces éléments sont des aides à la décision : le médecin reste seul juge.

export const PROFESSIONS = [
  "Cultivateur",
  "Élève",
  "Étudiant",
  "Professeur des Lycées et Collèges",
  "Professeur des écoles",
  "Militaire",
  "Policier",
  "Gendarme",
  "Médecin",
  "Infirmier",
  "FAF",
  "Commerçant",
  "Éleveur",
  "Restauratrice",
  "Autre à préciser",
];

// Professions proposées dans la liste (sans l'option « Autre »)
export const PROFESSIONS_CONNUES = PROFESSIONS.filter((p) => p !== "Autre à préciser");

// ---------------------------------------------------------------------------
// Alertes sur les constantes vitales
// ---------------------------------------------------------------------------

export interface AlerteClinique {
  cle: "hypertension" | "fievre" | "surcharge";
  niveau: "danger" | "warning";
  titre: string;
  detail: string;
}

// Interprète une tension saisie « 140/90 », « 14/9 » ou « 140 90 »
export function parseTension(tension: string): { sys: number; dia: number } | null {
  if (!tension) return null;
  const m = tension.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*[\/\-\s]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let sys = parseFloat(m[1]);
  let dia = parseFloat(m[2]);
  if (!sys || !dia) return null;
  // Tolère la notation en cmHg (14/9) en la convertissant en mmHg
  if (sys < 30) sys *= 10;
  if (dia < 20) dia *= 10;
  return { sys, dia };
}

export function analyserConstantes(input: {
  tension?: string;
  temperature?: string;
  imc?: number | null;
}): AlerteClinique[] {
  const alertes: AlerteClinique[] = [];

  const ta = parseTension(input.tension || "");
  if (ta && (ta.sys >= 140 || ta.dia >= 90)) {
    alertes.push({
      cle: "hypertension",
      niveau: ta.sys >= 180 || ta.dia >= 110 ? "danger" : "warning",
      titre: "Patient hypertendu",
      detail: `Tension ${ta.sys}/${ta.dia} mmHg (seuil 140/90). Contrôler et surveiller la tension artérielle.`,
    });
  }

  const temp = parseFloat((input.temperature || "").replace(",", "."));
  if (!isNaN(temp) && temp > 37.5) {
    alertes.push({
      cle: "fievre",
      niveau: temp >= 39 ? "danger" : "warning",
      titre: "Fièvre",
      detail: `Température ${temp}°C (seuil 37,5°C). Rechercher une cause infectieuse.`,
    });
  }

  const imc = input.imc ?? null;
  if (imc != null && imc > 24.99) {
    const obese = imc >= 30;
    alertes.push({
      cle: "surcharge",
      niveau: obese ? "danger" : "warning",
      titre: obese ? "Obésité" : "Surpoids",
      detail: `IMC ${imc.toFixed(1)} (seuil 25). ${obese ? "Obésité" : "Surcharge pondérale"} — conseils hygiéno-diététiques recommandés.`,
    });
  }

  return alertes;
}

// ---------------------------------------------------------------------------
// Hypothèses diagnostiques (moteur à base de règles)
// ---------------------------------------------------------------------------

export interface CliniqueContext {
  motif?: string;
  examen?: string;
  tension?: string;
  temperature?: string;
  pouls?: string;
  imc?: number | null;
  antecedents?: string;
}

export interface HypotheseDiagnostic {
  diagnostic: string;
  score: number;
  raisons: string[];
}

interface GroupeIndice {
  mots: string[];
  label: string;
}

interface Regle {
  diagnostic: string;
  indices: GroupeIndice[];
  minGroupes?: number; // nombre de groupes à retrouver pour proposer (défaut 1)
  bonus?: (ctx: NormCtx) => string | null; // renforcement par constantes / antécédents
}

interface NormCtx {
  texte: string; // motif + examen normalisés
  atcd: string; // antécédents normalisés
  ta: { sys: number; dia: number } | null;
  temp: number | null;
  imc: number | null;
}

// Minuscule + suppression des accents pour une comparaison robuste
function norm(s?: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const REGLES: Regle[] = [
  {
    diagnostic: "Paludisme",
    indices: [
      { mots: ["fievre", "corps chaud", "chaleur", "frisson"], label: "fièvre/frissons" },
      { mots: ["cephalee", "mal de tete", "maux de tete"], label: "céphalées" },
      { mots: ["courbature", "douleur musculaire", "myalgie"], label: "courbatures" },
      { mots: ["vomissement", "nausee"], label: "nausées/vomissements" },
      { mots: ["sueur", "transpiration"], label: "sueurs" },
    ],
    bonus: (c) => (c.temp != null && c.temp > 37.5 ? "température élevée" : null),
  },
  {
    diagnostic: "Fièvre typhoïde",
    indices: [
      { mots: ["fievre"], label: "fièvre" },
      { mots: ["douleur abdominale", "abdominale", "ventre", "abdomen"], label: "douleur abdominale" },
      { mots: ["diarrhee", "constipation", "transit"], label: "trouble du transit" },
      { mots: ["prolongee", "plusieurs jours", "une semaine", "depuis", "trainante"], label: "fièvre prolongée" },
    ],
    minGroupes: 2,
  },
  {
    diagnostic: "Pneumopathie / Infection respiratoire basse",
    indices: [
      { mots: ["toux"], label: "toux" },
      { mots: ["dyspnee", "essoufflement", "difficulte respiratoire", "gene respiratoire", "polypnee"], label: "dyspnée" },
      { mots: ["rale", "crepitant", "foyer", "sous-crepitant", "condensation"], label: "foyer auscultatoire" },
      { mots: ["expectoration", "crachat", "spute"], label: "expectorations" },
      { mots: ["douleur thoracique", "point de cote", "thorax"], label: "douleur thoracique" },
    ],
    minGroupes: 2,
    bonus: (c) => (c.temp != null && c.temp > 37.5 ? "fièvre associée" : null),
  },
  {
    diagnostic: "Rhinopharyngite / Infection respiratoire haute",
    indices: [
      { mots: ["ecoulement nasal", "rhinorrhee", "nez qui coule", "nez bouche", "obstruction nasale", "eternuement"], label: "rhinorrhée" },
      { mots: ["gorge", "pharynx", "angine", "deglutition", "amygdale"], label: "atteinte pharyngée" },
      { mots: ["toux"], label: "toux" },
      { mots: ["enrouement", "voix"], label: "enrouement" },
    ],
    minGroupes: 2,
  },
  {
    diagnostic: "Hypertension artérielle",
    indices: [
      { mots: ["cephalee", "mal de tete", "vertige", "bourdonnement", "acouphene", "phosphene", "mouches volantes", "epistaxis", "saignement de nez"], label: "signes fonctionnels d'HTA" },
    ],
    minGroupes: 0,
    bonus: (c) => {
      if (c.ta && (c.ta.sys >= 140 || c.ta.dia >= 90)) return "tension artérielle élevée";
      if (/hypertension|hta|tension/.test(c.atcd)) return "antécédent d'HTA";
      return null;
    },
  },
  {
    diagnostic: "Gastro-entérite aiguë",
    indices: [
      { mots: ["diarrhee", "selles liquides", "selles molles"], label: "diarrhée" },
      { mots: ["vomissement", "nausee"], label: "vomissements" },
      { mots: ["douleur abdominale", "crampe", "abdominale", "ventre"], label: "douleurs abdominales" },
      { mots: ["deshydratation", "pli cutane"], label: "déshydratation" },
    ],
    minGroupes: 2,
  },
  {
    diagnostic: "Infection urinaire",
    indices: [
      { mots: ["brulure mictionnelle", "brulure en urinant", "dysurie", "pollakiurie", "miction", "urine trouble", "urines"], label: "signes urinaires" },
      { mots: ["douleur lombaire", "fosse lombaire", "lombalgie", "lombaires"], label: "douleur lombaire" },
      { mots: ["fievre"], label: "fièvre" },
    ],
    minGroupes: 1,
  },
  {
    diagnostic: "Gastrite / Ulcère gastro-duodénal",
    indices: [
      { mots: ["epigastr", "creux de l'estomac", "estomac", "pyrosis", "remontee acide", "brulure gastrique", "acidite", "reflux"], label: "douleur épigastrique" },
      { mots: ["nausee", "vomissement"], label: "nausées" },
      { mots: ["a jeun", "apres repas", "faim"], label: "rythmée par les repas" },
    ],
    minGroupes: 1,
  },
  {
    diagnostic: "Diabète déséquilibré",
    indices: [
      { mots: ["polyurie", "urine abondante", "urine beaucoup", "polydipsie", "soif", "amaigrissement", "perte de poids", "maigri"], label: "syndrome polyuro-polydipsique" },
      { mots: ["asthenie", "fatigue"], label: "asthénie" },
    ],
    minGroupes: 1,
    bonus: (c) => (/diabet|glycemie/.test(c.atcd) ? "antécédent de diabète" : null),
  },
  {
    diagnostic: "Arthralgies / Affection rhumatismale",
    indices: [
      { mots: ["douleur articulaire", "articulation", "genou", "arthralgie", "raideur", "lombalgie", "dorsalgie", "arthrose", "gonflement articulaire"], label: "douleurs articulaires" },
    ],
    minGroupes: 1,
  },
  {
    diagnostic: "Dermatose / Réaction allergique",
    indices: [
      { mots: ["eruption", "prurit", "demangeaison", "bouton", "plaque", "urticaire", "lesion cutanee", "cutane", "rougeur"], label: "signes cutanés" },
    ],
    minGroupes: 1,
  },
  {
    diagnostic: "Conjonctivite",
    indices: [
      { mots: ["oeil rouge", "yeux rouges", "conjonctiv", "larmoiement", "oeil", "secretion oculaire"], label: "atteinte oculaire" },
    ],
    minGroupes: 1,
  },
  {
    diagnostic: "Anémie",
    indices: [
      { mots: ["pale", "paleur", "conjonctive pale", "muqueuse pale"], label: "pâleur" },
      { mots: ["asthenie", "fatigue", "vertige", "essoufflement effort"], label: "asthénie" },
    ],
    minGroupes: 1,
  },
  {
    diagnostic: "Syndrome grippal",
    indices: [
      { mots: ["fievre"], label: "fièvre" },
      { mots: ["courbature", "myalgie"], label: "courbatures" },
      { mots: ["cephalee", "mal de tete"], label: "céphalées" },
      { mots: ["toux", "rhume", "ecoulement nasal"], label: "signes respiratoires" },
    ],
    minGroupes: 3,
  },
];

export function hypothesesDiagnostiques(ctx: CliniqueContext): HypotheseDiagnostic[] {
  const nctx: NormCtx = {
    texte: norm(`${ctx.motif || ""} ${ctx.examen || ""}`),
    atcd: norm(ctx.antecedents || ""),
    ta: parseTension(ctx.tension || ""),
    temp: (() => {
      const t = parseFloat((ctx.temperature || "").replace(",", "."));
      return isNaN(t) ? null : t;
    })(),
    imc: ctx.imc ?? null,
  };

  if (!nctx.texte.trim() && !nctx.atcd.trim() && !nctx.ta && nctx.temp == null) return [];

  const resultats: HypotheseDiagnostic[] = [];

  for (const regle of REGLES) {
    const raisons: string[] = [];
    let groupes = 0;
    for (const grp of regle.indices) {
      if (grp.mots.some((m) => nctx.texte.includes(m))) {
        groupes++;
        raisons.push(grp.label);
      }
    }
    const bonus = regle.bonus ? regle.bonus(nctx) : null;
    if (bonus) raisons.push(bonus);

    const seuil = regle.minGroupes ?? 1;
    const propose = groupes >= Math.max(seuil, 1) || (seuil === 0 && bonus) || (groupes >= 1 && bonus);
    if (propose && raisons.length > 0) {
      resultats.push({ diagnostic: regle.diagnostic, score: groupes + (bonus ? 1 : 0), raisons });
    }
  }

  return resultats.sort((a, b) => b.score - a.score).slice(0, 5);
}
