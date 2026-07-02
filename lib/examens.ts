// Catalogue des examens complémentaires avec champs de résultats structurés.
// Chaque examen définit ses propres champs (valeur, unité, valeurs de référence).

export type CategorieExamen = "bilan_sanguin" | "imagerie" | "autres";
export type TypeChamp = "number" | "text" | "select";

export interface ChampResultat {
  cle: string;
  label: string;
  unite?: string;
  type?: TypeChamp; // défaut : "number"
  options?: string[]; // pour type "select"
  normale?: string; // valeurs de référence (indicatif)
}

export interface ExamenDef {
  nom: string;
  categorie: CategorieExamen;
  champs: ChampResultat[];
}

const POS_NEG = ["", "Positif", "Négatif"];
const POS_NEG_NF = ["", "Positif", "Négatif", "Non fait"];

export const CATALOGUE_EXAMENS: ExamenDef[] = [
  // ---------------------- Bilans sanguins ----------------------
  {
    nom: "Numération formule sanguine (NFS)",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "gb", label: "GB (Leucocytes)", unite: "/mm³", normale: "4000–10000" },
      { cle: "neutro", label: "Neutrophiles", unite: "%", normale: "45–70" },
      { cle: "lympho", label: "Lymphocytes", unite: "%", normale: "20–40" },
      { cle: "eosino", label: "Éosinophiles", unite: "%", normale: "1–3" },
      { cle: "gr", label: "GR (Hématies)", unite: "M/mm³", normale: "4–5,5" },
      { cle: "hb", label: "Hémoglobine (Hb)", unite: "g/dL", normale: "12–16" },
      { cle: "hte", label: "Hématocrite", unite: "%", normale: "37–47" },
      { cle: "vgm", label: "VGM", unite: "fL", normale: "80–100" },
      { cle: "plq", label: "Plaquettes", unite: "/mm³", normale: "150000–400000" },
    ],
  },
  {
    nom: "Glycémie",
    categorie: "bilan_sanguin",
    champs: [{ cle: "glycemie", label: "Glycémie à jeun", unite: "g/L", normale: "0,70–1,10" }],
  },
  {
    nom: "HbA1c (Hémoglobine glyquée)",
    categorie: "bilan_sanguin",
    champs: [{ cle: "hba1c", label: "HbA1c", unite: "%", normale: "< 6,5" }],
  },
  {
    nom: "Créatininémie",
    categorie: "bilan_sanguin",
    champs: [{ cle: "creatinine", label: "Créatinine", unite: "mg/L", normale: "7–13" }],
  },
  {
    nom: "Urémie",
    categorie: "bilan_sanguin",
    champs: [{ cle: "uree", label: "Urée", unite: "g/L", normale: "0,15–0,45" }],
  },
  {
    nom: "Ionogramme sanguin",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "na", label: "Sodium (Na)", unite: "mmol/L", normale: "135–145" },
      { cle: "k", label: "Potassium (K)", unite: "mmol/L", normale: "3,5–5,0" },
      { cle: "cl", label: "Chlore (Cl)", unite: "mmol/L", normale: "98–107" },
    ],
  },
  {
    nom: "Transaminases (ASAT/ALAT)",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "asat", label: "ASAT (TGO)", unite: "UI/L", normale: "< 40" },
      { cle: "alat", label: "ALAT (TGP)", unite: "UI/L", normale: "< 40" },
    ],
  },
  {
    nom: "Bilirubine",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "bili_tot", label: "Bilirubine totale", unite: "mg/L", normale: "< 10" },
      { cle: "bili_conj", label: "Bilirubine conjuguée", unite: "mg/L" },
    ],
  },
  {
    nom: "CRP (Protéine C-réactive)",
    categorie: "bilan_sanguin",
    champs: [{ cle: "crp", label: "CRP", unite: "mg/L", normale: "< 6" }],
  },
  {
    nom: "Vitesse de sédimentation (VS)",
    categorie: "bilan_sanguin",
    champs: [{ cle: "vs", label: "VS (1ʳᵉ heure)", unite: "mm", normale: "< 20" }],
  },
  {
    nom: "Goutte épaisse / Densité parasitaire",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "ge", label: "Goutte épaisse", type: "select", options: POS_NEG },
      { cle: "dp", label: "Densité parasitaire", unite: "/µL" },
    ],
  },
  {
    nom: "TDR Paludisme",
    categorie: "bilan_sanguin",
    champs: [{ cle: "tdr", label: "Résultat", type: "select", options: POS_NEG }],
  },
  {
    nom: "Sérologie de Widal",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "widal", label: "Résultat", type: "select", options: POS_NEG },
      { cle: "titre", label: "Titre (ex. 1/320)", type: "text" },
    ],
  },
  {
    nom: "Sérologie Dengue",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "ns1", label: "Ag NS1", type: "select", options: POS_NEG_NF },
      { cle: "igm", label: "IgM", type: "select", options: POS_NEG_NF },
      { cle: "igg", label: "IgG", type: "select", options: POS_NEG_NF },
    ],
  },
  {
    nom: "Sérologie VIH",
    categorie: "bilan_sanguin",
    champs: [{ cle: "vih", label: "Résultat", type: "select", options: POS_NEG }],
  },
  {
    nom: "Ag HBs (Hépatite B)",
    categorie: "bilan_sanguin",
    champs: [{ cle: "aghbs", label: "Ag HBs", type: "select", options: POS_NEG }],
  },
  {
    nom: "Ac anti-VHC (Hépatite C)",
    categorie: "bilan_sanguin",
    champs: [{ cle: "vhc", label: "Ac anti-VHC", type: "select", options: POS_NEG }],
  },
  {
    nom: "Bilan lipidique",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "chol", label: "Cholestérol total", unite: "g/L", normale: "< 2" },
      { cle: "hdl", label: "HDL", unite: "g/L" },
      { cle: "ldl", label: "LDL", unite: "g/L" },
      { cle: "tg", label: "Triglycérides", unite: "g/L", normale: "< 1,5" },
    ],
  },
  {
    nom: "Uricémie",
    categorie: "bilan_sanguin",
    champs: [{ cle: "acide_urique", label: "Acide urique", unite: "mg/L", normale: "30–70" }],
  },
  {
    nom: "TP / INR",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "tp", label: "TP", unite: "%", normale: "70–100" },
      { cle: "inr", label: "INR" },
    ],
  },
  {
    nom: "Groupage sanguin / Rhésus",
    categorie: "bilan_sanguin",
    champs: [
      { cle: "groupe", label: "Groupe", type: "select", options: ["", "A", "B", "AB", "O"] },
      { cle: "rhesus", label: "Rhésus", type: "select", options: ["", "Positif", "Négatif"] },
    ],
  },
  {
    nom: "Électrophorèse de l'hémoglobine",
    categorie: "bilan_sanguin",
    champs: [{ cle: "profil", label: "Profil (AA, AS, SS, AC...)", type: "text" }],
  },
  {
    nom: "Béta-HCG (grossesse)",
    categorie: "bilan_sanguin",
    champs: [{ cle: "bhcg", label: "Résultat", type: "select", options: POS_NEG }],
  },

  // ---------------------- Imagerie ----------------------
  {
    nom: "Radiographie thoracique",
    categorie: "imagerie",
    champs: [{ cle: "interpretation", label: "Interprétation", type: "text" }],
  },
  {
    nom: "Radiographie standard",
    categorie: "imagerie",
    champs: [{ cle: "interpretation", label: "Interprétation", type: "text" }],
  },
  {
    nom: "Échographie abdominale",
    categorie: "imagerie",
    champs: [{ cle: "interpretation", label: "Interprétation", type: "text" }],
  },
  {
    nom: "Échographie obstétricale",
    categorie: "imagerie",
    champs: [{ cle: "interpretation", label: "Interprétation", type: "text" }],
  },
  {
    nom: "Échographie",
    categorie: "imagerie",
    champs: [{ cle: "interpretation", label: "Interprétation", type: "text" }],
  },
  {
    nom: "Scanner (TDM)",
    categorie: "imagerie",
    champs: [{ cle: "interpretation", label: "Interprétation", type: "text" }],
  },
  {
    nom: "IRM",
    categorie: "imagerie",
    champs: [{ cle: "interpretation", label: "Interprétation", type: "text" }],
  },

  // ---------------------- Autres ----------------------
  {
    nom: "ECG (Électrocardiogramme)",
    categorie: "autres",
    champs: [
      { cle: "rythme", label: "Rythme", type: "text" },
      { cle: "frequence", label: "Fréquence", unite: "bpm" },
      { cle: "interpretation", label: "Interprétation", type: "text" },
    ],
  },
  {
    nom: "EEG (Électroencéphalogramme)",
    categorie: "autres",
    champs: [{ cle: "interpretation", label: "Interprétation", type: "text" }],
  },
  {
    nom: "ECBU (Examen cytobactériologique des urines)",
    categorie: "autres",
    champs: [
      { cle: "leucocyturie", label: "Leucocytes", unite: "/mL" },
      { cle: "nitrites", label: "Nitrites", type: "select", options: POS_NEG },
      { cle: "germe", label: "Germe identifié", type: "text" },
      { cle: "culture", label: "Culture", type: "text" },
    ],
  },
  {
    nom: "Bandelette urinaire",
    categorie: "autres",
    champs: [
      { cle: "leuco", label: "Leucocytes", type: "select", options: POS_NEG },
      { cle: "nitrites", label: "Nitrites", type: "select", options: POS_NEG },
      { cle: "proteines", label: "Protéines", type: "select", options: POS_NEG },
      { cle: "glucose", label: "Glucose", type: "select", options: POS_NEG },
      { cle: "sang", label: "Sang", type: "select", options: POS_NEG },
    ],
  },
  {
    nom: "Ponction lombaire (LCR)",
    categorie: "autres",
    champs: [
      { cle: "aspect", label: "Aspect", type: "text" },
      { cle: "gb_lcr", label: "GB", unite: "/mm³" },
      { cle: "proteinorachie", label: "Protéinorachie", unite: "g/L" },
      { cle: "glycorachie", label: "Glycorachie", unite: "g/L" },
    ],
  },
  {
    nom: "Test de grossesse urinaire",
    categorie: "autres",
    champs: [{ cle: "resultat", label: "Résultat", type: "select", options: POS_NEG }],
  },
  {
    nom: "Frottis / Prélèvement",
    categorie: "autres",
    champs: [{ cle: "resultat", label: "Résultat", type: "text" }],
  },
];

export const LIBELLES_CATEGORIES: Record<CategorieExamen, string> = {
  bilan_sanguin: "🩸 Bilan sanguin",
  imagerie: "🔬 Imagerie",
  autres: "📋 Autres examens",
};

export function examensParCategorie(cat: CategorieExamen): ExamenDef[] {
  return CATALOGUE_EXAMENS.filter((e) => e.categorie === cat);
}

export function trouverExamen(nom: string): ExamenDef | undefined {
  return CATALOGUE_EXAMENS.find((e) => e.nom === nom);
}

// Assemble les champs saisis en une chaîne lisible : "GB: 15000 /mm³ ; Hb: 9 g/dL"
export function formaterResultats(nom: string, valeurs: Record<string, string>): string {
  const def = trouverExamen(nom);
  if (!def) return Object.values(valeurs || {}).filter(Boolean).join(" ; ");
  const parts: string[] = [];
  for (const champ of def.champs) {
    const v = (valeurs?.[champ.cle] || "").trim();
    if (v) parts.push(`${champ.label}: ${v}${champ.unite ? " " + champ.unite : ""}`);
  }
  return parts.join(" ; ");
}
