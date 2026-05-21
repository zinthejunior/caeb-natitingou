import { useState } from 'react';
import { Cpu, Calendar as CalendarIcon, Clock, ShieldCheck, Monitor } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLabStations, creerReservationLab } from '@/hooks/useData';
import type { User, View } from '@/types';

interface LabPageProps {
  user: User | null;
  onNavigate: (view: View) => void;
}
     
export function LabPage({ user }: LabPageProps) {
  const { stations, isLoading } = useLabStations();
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Veuillez vous connecter pour réserver un poste.');
      return;
    }
    if (!selectedStation || !date || !time) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate start and end time (assuming 2 hour slots)
      const startTime = `${time}:00`;
      const endHour = parseInt(time.split(':')[0]) + 2;
      const endTime = `${endHour.toString().padStart(2, '0')}:00:00`;

      await creerReservationLab({
        station: selectedStation,
        date: date,
        start_time: startTime,
        end_time: endTime,
        purpose: purpose
      });
      toast.success('Réservation confirmée avec succès !', {
        description: `Le ${date} à ${time} au Laboratoire IA.`
      });
      // Reset form
      setSelectedStation(null);
      setDate('');
      setTime('');
      setPurpose('');
    } catch (err) {
      const description = err instanceof Error ? err.message : 'Créneau potentiellement indisponible.';
      toast.error('Erreur de réservation', { description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-library-bg pb-24 transition-colors duration-300">
      <Navbar user={user as User} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        
        <header className="relative w-full rounded-3xl overflow-hidden glass-effect border border-[var(--library-accent)]/20 shadow-card mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--library-accent)]/10 to-emerald-500/10 pointer-events-none" />
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="w-24 h-24 rounded-full bg-[var(--library-accent)]/20 flex items-center justify-center flex-shrink-0 shadow-soft animate-scale-in">
              <Cpu className="w-12 h-12 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-bold text-primary mb-3">
                Laboratoire IA
              </h1>
              <p className="text-muted max-w-2xl text-lg leading-relaxed">
                Découvrez le nouvel espace d'apprentissage technologique de la CAEB. 
                Réservez un ordinateur ou un casque VR pour vos formations, vos projets de code personnalisés.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Liste des Postes */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[var(--library-accent)]/10 rounded-xl">
                <Monitor className="w-5 h-5 text-accent" />
              </div>
              <h2 className="font-display text-2xl font-bold text-primary">Postes Accessibles</h2>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : stations.length === 0 ? (
              <div className="surface p-8 text-center rounded-2xl text-muted">
                Aucun poste disponible pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {stations.map((station: any) => (
                  <div 
                    key={station.id}
                    role="button"
                    onClick={() => station.isActive && setSelectedStation(station.id)}
                    className={`p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 tap-feedback ${
                      selectedStation === station.id 
                        ? 'border-[var(--library-accent)] bg-[var(--library-accent)]/5 shadow-medium scale-[1.02]' 
                        : 'border-[var(--border-color)] surface hover:border-[var(--library-accent)]/40 hover:shadow-card'
                    } ${!station.isActive && 'opacity-50 cursor-not-allowed grayscale'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      station.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary text-lg flex items-center gap-2">
                        {station.name}
                        {station.isActive ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Opérationnel</span>
                        ) : (
                          <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-bold">Maintenance</span>
                        )}
                      </h3>
                      <p className="text-sm text-muted">{station.specifications || 'Poste standard'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Formulaire de réservation */}
          <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="surface border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-elevated sticky top-24">
              <h2 className="font-display text-2xl font-bold text-primary mb-6 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-accent" />
                Réserver un créneau (2h)
              </h2>

              <form onSubmit={handleReserve} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Date souhaitée
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
                    <input 
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full h-12 pl-10 pr-4 surface-alt border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)]/50 focus:border-[var(--library-accent)] transition-all text-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Heure de début
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
                    <select
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 surface-alt border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)]/50 focus:border-[var(--library-accent)] transition-all text-primary appearance-none"
                      required
                    >
                      <option value="" disabled>Sélectionner un horaire</option>
                      <option value="08:00">08:00 - 10:00</option>
                      <option value="10:00">10:00 - 12:00</option>
                      <option value="14:00">14:00 - 16:00</option>
                      <option value="16:00">16:00 - 18:00</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Objectif (Optionnel)
                  </label>
                  <input 
                    type="text"
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="Ex: Formation Python, Projet IA, etc."
                    className="w-full h-12 px-4 surface-alt border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)]/50 focus:border-[var(--library-accent)] transition-all text-primary"
                  />
                </div>

                {!user && (
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 text-sm font-medium">
                    Vous devez être connecté pour effectuer une réservation.
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isSubmitting || !user || !selectedStation}
                  className="w-full h-14 rounded-xl btn-solid shadow-medium hover:shadow-elevated transition-all font-bold text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Réservation...' : 'Confirmer la réservation'}
                </Button>
              </form>
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
