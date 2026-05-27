// AdvancedFilters - Composant de filtres avancés pour le catalogue
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvancedFiltersProps {
  genres: string[];
  selectedGenres: string[];
  onGenreChange: (genres: string[]) => void;
  maxPrice?: number;
  selectedPrice?: number;
  onPriceChange?: (price: number) => void;
  availability?: 'all' | 'available' | 'unavailable';
  onAvailabilityChange?: (availability: 'all' | 'available' | 'unavailable') => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedFilters({
  genres,
  selectedGenres,
  onGenreChange,
  availability = 'all',
  onAvailabilityChange,
  isOpen,
  onClose,
}: AdvancedFiltersProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start pt-20">
      <div className="surface dark:bg-library-dark-secondary w-full sm:w-80 mx-auto rounded-b-2xl shadow-2xl p-6 space-y-6 max-h-[80vh] overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-library-primary dark:text-library-dark-accent" />
            <h3 className="font-bold text-lg text-primary dark:text-library-dark-light">Filtres</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Genres */}
        <div>
          <h4 className="font-semibold text-primary dark:text-library-dark-light mb-3">Genres</h4>
          <div className="space-y-2">
            {genres.map((genre) => (
              <label key={genre} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedGenres.includes(genre)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onGenreChange([...selectedGenres, genre]);
                    } else {
                      onGenreChange(selectedGenres.filter(g => g !== genre));
                    }
                  }}
                  className="w-4 h-4 rounded border-muted accent-library-primary dark:accent-library-dark-accent"
                />
                <span className="text-sm text-slate-700 dark:text-library-dark-muted group-hover:text-primary dark:group-hover:text-library-dark-light transition-colors">
                  {genre}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Disponibilité */}
        <div>
          <h4 className="font-semibold text-primary dark:text-library-dark-light mb-3">Disponibilité</h4>
          <div className="space-y-2">
            {(['all', 'available', 'unavailable'] as const).map((option) => (
              <label key={option} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="availability"
                  value={option}
                  checked={availability === option}
                  onChange={() => onAvailabilityChange?.(option)}
                  className="w-4 h-4 border-muted accent-library-primary dark:accent-library-dark-accent"
                />
                <span className="text-sm text-slate-700 dark:text-library-dark-muted group-hover:text-primary dark:group-hover:text-library-dark-light transition-colors">
                  {option === 'all' ? 'Tous' : option === 'available' ? 'Disponibles' : 'Indisponibles'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-2 pt-4 border-t border-muted dark:border-library-dark-secondary">
          <Button
            onClick={() => {
              onGenreChange([]);
              onAvailabilityChange?.('all');
            }}
            variant="outline"
            className="flex-1"
          >
            Réinitialiser
          </Button>
          <Button onClick={onClose} className="flex-1">
            Appliquer
          </Button>
        </div>
      </div>
    </div>
  );
}
