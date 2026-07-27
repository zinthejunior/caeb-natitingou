import React, { useState, useMemo } from "react";
import { Filter, X, Check, Search, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdvancedFilters({
  books = [],
  activeFilters = {},
  onFilterChange,
  isOpen,
  onClose
}) {
  const [selectedCriterion, setSelectedCriterion] = useState("genre"); // default criterion
  const [searchValue, setSearchValue] = useState("");

  // Extraction dynamique et automatique des valeurs uniques depuis le catalogue existant
  const criteriaData = useMemo(() => {
    const authors = new Set();
    const genres = new Set();
    const years = new Set();
    const sections = new Set();
    const ageCategories = new Set();

    books.forEach((b) => {
      if (b.auteur) authors.add(b.auteur.strip ? b.auteur.strip() : b.auteur);
      if (b.genre) genres.add(b.genre);
      if (b.annee) years.add(String(b.annee));
      if (b.section) sections.add(b.section);
      if (b.categorie_age) ageCategories.add(b.categorie_age);
    });

    return {
      auteur: Array.from(authors).sort((a, b) => a.localeCompare(b)),
      genre: Array.from(genres).sort((a, b) => a.localeCompare(b)),
      annee: Array.from(years).sort((a, b) => b - a),
      edition: Array.from(sections).sort((a, b) => a.localeCompare(b)),
      categorie_age: Array.from(ageCategories).sort()
    };
  }, [books]);

  if (!isOpen) return null;

  const currentValues = (criteriaData[selectedCriterion] || []).filter((v) =>
    v.toLowerCase().includes(searchValue.toLowerCase())
  );

  const criteriaList = [
    { key: "genre", label: "Genre", icon: "📚" },
    { key: "auteur", label: "Auteur", icon: "✍️" },
    { key: "annee", label: "Année", icon: "📅" },
    { key: "edition", label: "Édition / Section", icon: "🏛️" },
    { key: "categorie_age", label: "Catégorie d'âge", icon: "👥" }
  ];

  const handleSelectValue = (value) => {
    const current = activeFilters[selectedCriterion] || [];
    const isSelected = current.includes(value);
    const updated = isSelected
      ? current.filter((item) => item !== value)
      : [...current, value];

    onFilterChange?.({
      ...activeFilters,
      [selectedCriterion]: updated
    });
  };

  const clearAll = () => {
    onFilterChange?.({
      genre: [],
      auteur: [],
      annee: [],
      edition: [],
      categorie_age: []
    });
  };

  const activeCount = Object.values(activeFilters).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-library-primary rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Filtres du catalogue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sélectionnez un critère puis choisissez les valeurs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone active des critères */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {criteriaList.map((c) => {
              const activeInCriterion = (activeFilters[c.key] || []).length;
              const isSelected = selectedCriterion === c.key;

              return (
                <button
                  key={c.key}
                  onClick={() => {
                    setSelectedCriterion(c.key);
                    setSearchValue("");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-library-primary text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                  {activeInCriterion > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white">
                      {activeInCriterion}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Barre de recherche dans les valeurs */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Filtrer par ${criteriaList.find((c) => c.key === selectedCriterion)?.label.toLowerCase()}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full text-xs bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchValue && (
            <button onClick={() => setSearchValue("")} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Liste dynamique des valeurs du critère sélectionné */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {currentValues.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune valeur disponible pour ce critère
            </div>
          ) : (
            currentValues.map((val) => {
              const selectedValues = activeFilters[selectedCriterion] || [];
              const isChecked = selectedValues.includes(val);

              return (
                <button
                  key={val}
                  onClick={() => handleSelectValue(val)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                    isChecked
                      ? "bg-blue-50 dark:bg-blue-900/20 text-library-primary dark:text-blue-400 font-semibold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="truncate pr-2">{val}</span>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                      isChecked
                        ? "bg-library-primary border-library-primary text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pied de page et actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <button
            onClick={clearAll}
            disabled={activeCount === 0}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
          <Button onClick={onClose} size="sm" className="px-6 rounded-xl text-xs font-semibold">
            Voir les résultats ({activeCount > 0 ? `${activeCount} filtre(s)` : "Tous"})
          </Button>
        </div>
      </div>
    </div>
  );
}
