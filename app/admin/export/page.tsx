"use client";
import { useState } from "react";
import * as XLSX from "xlsx";

interface ExportRow {
  nom: string; prenom: string; age: number | null; sexe: string; motif: string;
  tension: string; temperature: string; poids: string; taille: string; imc: number | null;
  diagnostic: string; type_traitement: string; duree_sejour: number | null;
  medecin: string; date: string;
}

// Colonnes disponibles : clé technique + libellé affiché
const COLONNES: { key: keyof ExportRow; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "nom", label: "Nom" },
  { key: "prenom", label: "Prénom" },
  { key: "age", label: "Âge" },
  { key: "sexe", label: "Sexe" },
  { key: "motif", label: "Motif de consultation" },
  { key: "tension", label: "TA (Tension artérielle)" },
  { key: "temperature", label: "Température" },
  { key: "poids", label: "Poids" },
  { key: "taille", label: "Taille" },
  { key: "imc", label: "IMC" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "type_traitement", label: "Type de traitement" },
  { key: "duree_sejour", label: "Durée de séjour (jours)" },
  { key: "medecin", label: "Médecin traitant" },
];

export default function ExportPage() {
  const [selection, setSelection] = useState<Set<string>>(
    new Set(COLONNES.map((c) => c.key as string))
  );
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const toggle = (key: string) => {
    const s = new Set(selection);
    s.has(key) ? s.delete(key) : s.add(key);
    setSelection(s);
  };

  const toutSelectionner = () => setSelection(new Set(COLONNES.map((c) => c.key as string)));
  const toutDeselectionner = () => setSelection(new Set());

  const handleExport = async () => {
    if (selection.size === 0) {
      setMessage({ type: "error", text: "Sélectionnez au moins une colonne." });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });

    const qs = new URLSearchParams();
    if (dateDebut) qs.set("date_debut", dateDebut);
    if (dateFin) qs.set("date_fin", dateFin);
    const res = await fetch(`/api/admin/export?${qs.toString()}`);
    if (!res.ok) {
      setLoading(false);
      setMessage({ type: "error", text: "Erreur lors de la récupération des données." });
      return;
    }
    const rows: ExportRow[] = await res.json();
    if (rows.length === 0) {
      setLoading(false);
      setMessage({ type: "error", text: "Aucune consultation trouvée pour cette période." });
      return;
    }

    // Colonnes retenues dans l'ordre d'affichage
    const cols = COLONNES.filter((c) => selection.has(c.key as string));
    const aoa: (string | number)[][] = [
      cols.map((c) => c.label),
      ...rows.map((r) =>
        cols.map((c) => {
          const v = r[c.key];
          return v == null ? "" : (v as string | number);
        })
      ),
    ];

    const dateSuffix = new Date().toISOString().slice(0, 10);
    const nomFichier = `consultations_${dateSuffix}`;

    if (format === "csv") {
      // CSV avec BOM UTF-8 (accents corrects dans Excel) et séparateur ;
      const csv = aoa
        .map((ligne) =>
          ligne
            .map((cell) => {
              const s = String(cell).replace(/"/g, '""');
              return /[";\n]/.test(s) ? `"${s}"` : s;
            })
            .join(";")
        )
        .join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      telecharger(blob, `${nomFichier}.csv`);
    } else {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Consultations");
      XLSX.writeFile(wb, `${nomFichier}.xlsx`);
    }

    setLoading(false);
    setMessage({ type: "success", text: `${rows.length} consultation(s) exportée(s) avec succès.` });
  };

  const telecharger = (blob: Blob, nom: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nom;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Export des consultations</h1>
        <p className="text-gray-500 text-sm mt-1">
          Sélectionnez les données et le format, puis téléchargez le fichier.
        </p>
      </div>

      {message.text && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm ${
            message.type === "error"
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Période */}
      <div className="card mb-5">
        <h3 className="font-semibold text-gray-700 mb-3">Période (optionnel)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Du</label>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Au</label>
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="input-field" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Laissez vide pour exporter toutes les consultations.</p>
      </div>

      {/* Colonnes */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Données à exporter</h3>
          <div className="flex gap-2 text-xs">
            <button onClick={toutSelectionner} className="text-primary-600 hover:text-primary-700 font-medium">Tout</button>
            <span className="text-gray-300">|</span>
            <button onClick={toutDeselectionner} className="text-gray-500 hover:text-gray-700 font-medium">Aucun</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COLONNES.map((c) => (
            <label
              key={c.key as string}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                selection.has(c.key as string)
                  ? "border-primary-300 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selection.has(c.key as string)}
                onChange={() => toggle(c.key as string)}
                className="rounded"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="card mb-5">
        <h3 className="font-semibold text-gray-700 mb-3">Format du fichier</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormat("xlsx")}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              format === "xlsx" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-lg flex-shrink-0">📊</div>
            <div>
              <p className={`text-sm font-semibold ${format === "xlsx" ? "text-emerald-700" : "text-gray-700"}`}>Excel (.xlsx)</p>
              <p className="text-xs text-gray-400">Tableur Microsoft Excel</p>
            </div>
            {format === "xlsx" && <span className="ml-auto text-emerald-600">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => setFormat("csv")}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              format === "csv" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center text-lg flex-shrink-0">📄</div>
            <div>
              <p className={`text-sm font-semibold ${format === "csv" ? "text-primary-700" : "text-gray-700"}`}>CSV (.csv)</p>
              <p className="text-xs text-gray-400">Texte séparé par points-virgules</p>
            </div>
            {format === "csv" && <span className="ml-auto text-primary-600">✓</span>}
          </button>
        </div>
      </div>

      <button onClick={handleExport} disabled={loading} className="btn-primary px-8">
        {loading ? "Export en cours..." : `Exporter (${selection.size} colonne${selection.size > 1 ? "s" : ""})`}
      </button>
    </div>
  );
}
