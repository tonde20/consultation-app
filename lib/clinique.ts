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
  // Résultats des examens paracliniques (NFS, glycémie, sérologies, GE...)
  examens?: { type_examen?: string; resultat?: string }[];
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

// Extrait une valeur numérique associée à un libellé dans un texte d'examen
// (ex. « leucocytes 15000 » → 15000, « hb: 8,5 » → 8.5)
function extraireValeur(txt: string, labels: string[]): number | null {
  for (const lab of labels) {
    const re = new RegExp(lab + "[^0-9]{0,15}([0-9]+(?:[.,][0-9]+)?)");
    const m = txt.match(re);
    if (m) return parseFloat(m[1].replace(",", "."));
  }
  return null;
}

// Un résultat texte contient-il une positivité ? (sélecteurs Positif/Négatif)
function resultatPositif(resultat: string): boolean {
  const r = norm(resultat);
  if (!r) return false;
  if (/\bnegati/.test(r) && !/positi/.test(r)) return false;
  return /positi|reactif|present|\+/.test(r);
}

// Analyse les résultats paracliniques et renforce / ajoute des hypothèses
function analyserExamens(examens: { type_examen?: string; resultat?: string }[] | undefined) {
  const apports: { diagnostic: string; raison: string; poids: number }[] = [];
  if (!examens || examens.length === 0) return apports;
  const ajoute = (diagnostic: string, raison: string, poids: number) => apports.push({ diagnostic, raison, poids });

  const txt = norm(examens.map((e) => `${e.type_examen || ""} ${e.resultat || ""}`).join(" ; "));
  if (!txt.trim()) return apports;

  // ---- Marqueurs numériques (le nombre suit directement son libellé) ----

  // NFS — Leucocytes /mm3 (ou G/L)
  const gb = extraireValeur(txt, ["leucocyte", "globules blancs", "\\bgb\\b", "leuco"]);
  if (gb != null) {
    const val = gb < 100 ? gb * 1000 : gb;
    if (val > 10000) {
      ajoute("Infection bactérienne", `hyperleucocytose (${gb})`, 2);
      ajoute("Pneumopathie / Infection respiratoire basse", "hyperleucocytose", 1);
      ajoute("Infection urinaire", "hyperleucocytose", 1);
    } else if (val < 4000) {
      ajoute("Fièvre typhoïde", `leucopénie (${gb})`, 1);
      ajoute("Dengue", "leucopénie", 1);
      ajoute("Paludisme", "leucopénie", 1);
    }
  }
  // Neutrophiles (%) élevés → orientation bactérienne
  const neutro = extraireValeur(txt, ["neutrophile", "\\bpnn\\b"]);
  if (neutro != null && neutro > 75 && neutro <= 100) {
    ajoute("Infection bactérienne", `polynucléose neutrophile (${neutro}%)`, 1);
  }

  // Hémoglobine (g/dL) → anémie
  const hb = extraireValeur(txt, ["hemoglobine", "\\bhb\\b", "hgb"]);
  if (hb != null && hb > 0 && hb < 11) {
    ajoute("Anémie", `Hb basse (${hb} g/dL)`, hb < 7 ? 3 : 2);
  }

  // Plaquettes → thrombopénie
  const plq = extraireValeur(txt, ["plaquette", "\\bplq\\b", "thrombocyte"]);
  if (plq != null) {
    const val = plq < 1000 ? plq * 1000 : plq;
    if (val < 150000) {
      ajoute("Dengue", `thrombopénie (${plq})`, 2);
      ajoute("Paludisme", "thrombopénie", 1);
    }
  }

  // Glycémie (g/L ou mmol/L) & HbA1c → diabète
  const gly = extraireValeur(txt, ["glycemie", "glucose"]);
  if (gly != null && ((gly < 30 && gly > 1.26) || gly >= 7)) {
    ajoute("Diabète déséquilibré", `hyperglycémie (${gly})`, 2);
  }
  const hba1c = extraireValeur(txt, ["hba1c", "hemoglobine glyquee"]);
  if (hba1c != null && hba1c > 6.5 && hba1c < 20) {
    ajoute("Diabète déséquilibré", `HbA1c élevée (${hba1c}%)`, 2);
  }

  // CRP / VS → syndrome inflammatoire (oriente bactérien)
  const crp = extraireValeur(txt, ["crp", "proteine c-reactive"]);
  if (crp != null && crp > 6) {
    ajoute("Infection bactérienne", `CRP élevée (${crp} mg/L)`, crp > 50 ? 2 : 1);
  }
  const vs = extraireValeur(txt, ["vitesse de sedimentation", "\\bvs\\b"]);
  if (vs != null && vs > 20) ajoute("Infection bactérienne", `VS accélérée (${vs} mm)`, 1);

  // Créatinine (mg/L ou µmol/L) & urée → insuffisance rénale
  const crea = extraireValeur(txt, ["creatinine"]);
  if (crea != null) {
    const anormal = crea > 30 ? crea > 115 : crea > 13; // µmol/L sinon mg/L
    if (anormal) ajoute("Insuffisance rénale", `créatinine élevée (${crea})`, 2);
  }
  const uree = extraireValeur(txt, ["uree"]);
  if (uree != null && ((uree < 5 && uree > 0.5) || uree >= 8)) {
    ajoute("Insuffisance rénale", `urée élevée (${uree})`, 1);
  }

  // Transaminases / bilirubine → atteinte hépatique
  const asat = extraireValeur(txt, ["asat", "\\btgo\\b"]);
  const alat = extraireValeur(txt, ["alat", "\\btgp\\b"]);
  const tMax = Math.max(asat ?? 0, alat ?? 0);
  if (tMax > 40) ajoute("Cytolyse hépatique / Hépatite", `transaminases élevées (${tMax} UI/L)`, tMax > 200 ? 3 : 2);
  const bili = extraireValeur(txt, ["bilirubine totale", "bilirubine"]);
  if (bili != null && bili > 12) ajoute("Cytolyse hépatique / Hépatite", `hyperbilirubinémie (${bili})`, 1);

  // Ionogramme — potassium
  const k = extraireValeur(txt, ["potassium", "\\bk\\b"]);
  if (k != null && k > 0 && k < 20 && (k < 3.5 || k > 5)) {
    ajoute("Trouble hydro-électrolytique", `kaliémie anormale (${k} mmol/L)`, 2);
  }

  // Bilan lipidique / uricémie
  const chol = extraireValeur(txt, ["cholesterol total", "cholesterol"]);
  const tg = extraireValeur(txt, ["triglyceride"]);
  if ((chol != null && chol > 2) || (tg != null && tg > 1.5)) {
    ajoute("Dyslipidémie", "bilan lipidique perturbé", 2);
  }
  const urate = extraireValeur(txt, ["acide urique", "uricemie"]);
  if (urate != null && urate > 70) ajoute("Hyperuricémie (goutte)", `acide urique élevé (${urate})`, 2);

  // LCR — méningite
  const gbLcr = extraireValeur(txt, ["\\bgb\\b.{0,40}lcr", "lcr.{0,40}gb"]);
  if ((examens.some((e) => /lcr|ponction lombaire/i.test(e.type_examen || "")) && (gbLcr != null && gbLcr > 10))) {
    ajoute("Méningite", "cellularité élevée dans le LCR", 3);
  }

  // ---- Sérologies & tests qualitatifs (positif / négatif, par examen) ----
  for (const e of examens) {
    const nom = norm(e.type_examen || "");
    const pos = resultatPositif(e.resultat || "");
    const dp = extraireValeur(norm(e.resultat || ""), ["densite parasitaire", "\\bdp\\b"]);
    if ((/goutte epaisse|tdr|paludisme|plasmodium/.test(nom) && pos) || (dp != null && dp > 0)) {
      ajoute("Paludisme", "test parasitologique positif", 4);
    }
    if (/widal|typhoid|salmonella/.test(nom) && pos) ajoute("Fièvre typhoïde", "sérologie de Widal positive", 3);
    if (/dengue|ns1/.test(nom) && pos) ajoute("Dengue", "sérologie Dengue positive", 3);
    if (/vih/.test(nom) && pos) ajoute("Infection à VIH", "sérologie VIH positive", 3);
    if (/hbs|hepatite b/.test(nom) && pos) ajoute("Hépatite B", "Ag HBs positif", 3);
    if (/vhc|hepatite c/.test(nom) && pos) ajoute("Hépatite C", "Ac anti-VHC positif", 3);
    if (/hcg|grossesse/.test(nom) && pos) ajoute("Grossesse", "test de grossesse positif", 3);
    if (/ecbu|bandelette/.test(nom)) {
      const r = norm(e.resultat || "");
      if (pos || /nitrite|leucocyt/.test(r)) {
        if (/positi/.test(r) || /nitrite.{0,15}positi|leuco.{0,15}positi/.test(r))
          ajoute("Infection urinaire", "ECBU/bandelette évocateur", 2);
      }
    }
  }

  return apports;
}

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

  const apportsExamens = analyserExamens(ctx.examens);

  if (
    !nctx.texte.trim() &&
    !nctx.atcd.trim() &&
    !nctx.ta &&
    nctx.temp == null &&
    apportsExamens.length === 0
  )
    return [];

  // Accumulateur diagnostic -> { score, raisons }
  const acc = new Map<string, { score: number; raisons: string[] }>();
  const ajouter = (diagnostic: string, score: number, raison: string) => {
    const cur = acc.get(diagnostic) || { score: 0, raisons: [] };
    cur.score += score;
    if (raison && !cur.raisons.includes(raison)) cur.raisons.push(raison);
    acc.set(diagnostic, cur);
  };

  // 1) Règles cliniques (motif + examen + constantes)
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
      const cur = acc.get(regle.diagnostic) || { score: 0, raisons: [] };
      cur.score += groupes + (bonus ? 1 : 0);
      for (const r of raisons) if (!cur.raisons.includes(r)) cur.raisons.push(r);
      acc.set(regle.diagnostic, cur);
    }
  }

  // 2) Apports des examens paracliniques (n'ajoute un diagnostic isolé que s'il
  //    est déjà suspecté cliniquement, sauf preuve forte poids >= 3)
  for (const a of apportsExamens) {
    if (acc.has(a.diagnostic) || a.poids >= 2) {
      ajouter(a.diagnostic, a.poids, a.raison);
    }
  }

  return Array.from(acc.entries())
    .map(([diagnostic, v]) => ({ diagnostic, score: v.score, raisons: v.raisons }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
