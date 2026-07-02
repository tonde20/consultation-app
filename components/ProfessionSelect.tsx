"use client";
import { useEffect, useState } from "react";
import { PROFESSIONS_CONNUES } from "@/lib/clinique";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

// Liste déroulante des professions avec option « Autre à préciser » (saisie libre)
export default function ProfessionSelect({ value, onChange, className = "input-field" }: Props) {
  const estValeurLibre = value !== "" && !PROFESSIONS_CONNUES.includes(value);
  const [autre, setAutre] = useState(estValeurLibre);

  // Si la valeur devient une profession libre (édition d'un patient existant), basculer en mode « Autre »
  useEffect(() => {
    if (value !== "" && !PROFESSIONS_CONNUES.includes(value)) setAutre(true);
    if (value === "" && !autre) setAutre(false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <select
        value={autre ? "__autre__" : value}
        onChange={(e) => {
          if (e.target.value === "__autre__") {
            setAutre(true);
            onChange("");
          } else {
            setAutre(false);
            onChange(e.target.value);
          }
        }}
        className={className}
      >
        <option value="">-- Sélectionner --</option>
        {PROFESSIONS_CONNUES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value="__autre__">Autre à préciser</option>
      </select>
      {autre && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Préciser la profession"
          className={`${className} mt-2`}
        />
      )}
    </>
  );
}
