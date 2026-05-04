// Page des emprunts — CAEB Design System
import { BookOpen, RotateCw, Clock, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ApiImage } from '@/components/ApiImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { User } from '@/types';
import { useEmprunts, useReservations } from '@/hooks/useData';
import { toast } from 'sonner';
import { useState } from 'react';

interface BorrowsPageProps {
  user: User | null;
}

// ── EMPTY STATE — Livre ouvert ─────────────────────────────────────────
function EmptyBorrows() {
  return (
    <div className="empty-state py-16 surface rounded-2xl border border-[var(--border-color)]">
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Livre ouvert */}
        <path d="M20 35 L60 42 L100 35 L100 90 L60 97 L20 90 Z"
          stroke="currentColor" strokeWidth="1.5" fill="none" className="text-[var(--library-accent)] opacity-20" />
        <line x1="60" y1="42" x2="60" y2="97" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="text-[var(--library-accent)] opacity-30" />
        {/* Pages gauche */}
        <line x1="28" y1="52" x2="55" y2="55" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-[var(--library-accent)] opacity-25" />
        <line x1="28" y1="60" x2="55" y2="63" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-[var(--library-accent)] opacity-25" />
        <line x1="28" y1="68" x2="55" y2="71" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-[var(--library-accent)] opacity-25" />
        {/* Pages droite */}
        <line x1="65" y1="55" x2="92" y2="52" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-[var(--library-accent)] opacity-25" />
        <line x1="65" y1="63" x2="92" y2="60" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-[var(--library-accent)] opacity-25" />
        <line x1="65" y1="71" x2="92" y2="68" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-[var(--library-accent)] opacity-25" />
        {/* Cercle check */}
        <circle cx="60" cy="22" r="12" stroke="currentColor" strokeWidth="1.5" className="text-emerald-500 opacity-30" fill="none" />
        <path d="M54 22 L58 26 L66 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 opacity-40" />
      </svg>
      <h3 className="text-lg font-semibold text-primary">Aucun emprunt en cours</h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        Votre table de chevet est vide ? Parcourez notre catalogue et laissez-vous tenter par votre prochaine lecture !
      </p>
    </div>
  );
}

// ── EMPTY STATE — Réservations ──────────────────────────────────────────
function EmptyReservations() {
  return (
    <div className="empty-state py-16 surface rounded-2xl border border-[var(--border-color)]">
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Calendrier */}
        <rect x="20" y="30" width="80" height="70" rx="8" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-[var(--library-accent)] opacity-20" />
        {/* Entête calendrier */}
        <rect x="20" y="30" width="80" height="22" rx="8" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        <rect x="20" y="44" width="80" height="8" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        {/* Crochets */}
        <rect x="38" y="22" width="6" height="16" rx="3" fill="currentColor" className="text-[var(--library-accent)] opacity-25" />
        <rect x="76" y="22" width="6" height="16" rx="3" fill="currentColor" className="text-[var(--library-accent)] opacity-25" />
        {/* Cases vides */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={i} x={27 + (i % 3) * 22} y={65 + Math.floor(i / 3) * 18} width="16" height="12" rx="3"
            stroke="currentColor" strokeWidth="1" fill="none" className="text-[var(--library-accent)] opacity-15" />
        ))}
      </svg>
      <h3 className="text-lg font-semibold text-primary">Aucune réservation</h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        Un ouvrage vous fait de l'œil mais il est déjà pris ? Réservez-le et nous vous ferons signe dès son retour.
      </p>
    </div>
  );
}

export function BorrowsPage({ user }: BorrowsPageProps) {
  const [activeTab, setActiveTab] = useState<'borrows' | 'reservations'>('borrows');
  const { emprunts = [] } = useEmprunts();
  const { reservations = [] } = useReservations();

  if (!user) {
    return (
      <div className="min-h-screen bg-library-bg pb-24">
        <Navbar utilisateur={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <div className="surface rounded-2xl p-8 text-center border border-[var(--border-color)]">
            <p className="text-muted">Veuillez vous connecter pour voir vos emprunts</p>
          </div>
        </main>
      </div>
    );
  }

  const handleRenew = () => toast.success('Livre renouvelé pour 14 jours supplémentaires');
  const handleCancel = () => toast.info('Réservation annulée');

  const calculateDaysRemaining = (returnDate: string) => {
    const today = new Date();
    const ret = new Date(returnDate);
    return Math.ceil((ret.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const tabClass = (active: boolean) =>
    `pb-3 px-2 font-semibold transition-all focus:outline-none rounded text-sm tap-feedback ${active
      ? 'text-accent border-b-2 border-[var(--library-accent)]'
      : 'text-muted hover:text-primary'
    }`;

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar utilisateur={user} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary">Mes emprunts</h1>
          </div>
          <p className="text-muted pl-1">Suivez vos emprunts en cours et vos réservations en attente</p>
        </div>

        {/* Onglets */}
        <div className="flex gap-4 mb-8 border-b border-[var(--border-color)]">
          <button onClick={() => setActiveTab('borrows')} className={tabClass(activeTab === 'borrows')}
            aria-selected={activeTab === 'borrows'} role="tab">
            <span className="hidden sm:inline">Emprunts actuels</span>
            <span className="sm:hidden">Emprunts</span>
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full surface-alt border border-[var(--border-color)]">{emprunts.length}</span>
          </button>
          <button onClick={() => setActiveTab('reservations')} className={tabClass(activeTab === 'reservations')}
            aria-selected={activeTab === 'reservations'} role="tab">
            <span className="hidden sm:inline">Réservations</span>
            <span className="sm:hidden">Réservés</span>
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full surface-alt border border-[var(--border-color)]">{reservations.length}</span>
          </button>
        </div>

        {/* Contenu */}
        <div className="space-y-4">
          {activeTab === 'borrows' ? (
            emprunts.length > 0 ? (
              (emprunts as unknown[]).map((emprunt: any) => {
                const daysRemaining = calculateDaysRemaining(emprunt.returnDate);
                const isOverdue = daysRemaining < 0;
                const isWarning = !isOverdue && daysRemaining < 3;
                const progressValue = Math.max(0, Math.min(100, ((14 - Math.max(0, daysRemaining)) / 14) * 100));

                return (
                  <div key={emprunt.id} className="surface rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all">
                    <div className="flex gap-4">
                      <div className="hidden sm:block w-16 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-soft">
                        <ApiImage src={emprunt.book.cover} alt={emprunt.book.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-bold text-primary">{emprunt.book.title}</h3>
                            <p className="text-sm text-muted">{emprunt.book.author}</p>
                          </div>
                          {isOverdue ? (
                            <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 flex-shrink-0">En retard</Badge>
                          ) : isWarning ? (
                            <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 flex-shrink-0">Bientôt dû</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex-shrink-0">En cours</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-0.5">Emprunté le</p>
                            <p className="text-primary font-medium">{new Date(emprunt.borrowDate).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-0.5">À retourner le</p>
                            <p className={`font-semibold ${isOverdue ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-primary'}`}>
                              {new Date(emprunt.returnDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-muted mb-1.5">
                            <span>{Math.max(0, daysRemaining)} jour{Math.max(0, daysRemaining) !== 1 ? 's' : ''} restant{Math.max(0, daysRemaining) !== 1 ? 's' : ''}</span>
                            <span>14 jours</span>
                          </div>
                          <Progress value={progressValue} className="h-2" />
                        </div>

                        <div className="flex gap-2">
                          {!emprunt.isExtended ? (
                            <Button onClick={() => handleRenew()} size="sm" variant="outline"
                              className="gap-2 border-[var(--library-accent)]/30 text-accent hover:bg-[var(--library-accent)]/10 font-semibold tap-feedback">
                              <RotateCw className="w-4 h-4" />
                              <span className="hidden sm:inline">Renouveler</span>
                              <span className="sm:hidden">Renouveler</span>
                            </Button>
                          ) : (
                            <Badge className="surface-weak text-muted border border-[var(--border-color)]">Déjà renouvelé</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyBorrows />
            )
          ) : (
            reservations.length > 0 ? (
              (reservations as unknown[]).map((reservation: any) => (
                <div key={reservation.id} className="surface rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all">
                  <div className="flex gap-4">
                    <div className="hidden sm:block w-16 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-soft">
                      <ApiImage src={reservation.book.cover} alt={reservation.book.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-primary">{reservation.book.title}</h3>
                          <p className="text-sm text-muted">{reservation.book.author}</p>
                        </div>
                        {reservation.status === 'available' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 gap-1">
                            <CheckCircle2 className="w-3 h-3" />Disponible
                          </Badge>
                        ) : (
                          <Badge className="bg-[var(--library-accent)]/10 text-accent border border-[var(--library-accent)]/20 gap-1">
                            <Clock className="w-3 h-3" />En attente
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted mb-3">
                        Réservé le {new Date(reservation.reservedAt).toLocaleDateString('fr-FR')}
                      </p>
                      <Button onClick={() => handleCancel()} size="sm" variant="destructive"
                        className="font-semibold tap-feedback">
                        Annuler la réservation
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyReservations />
            )
          )}
        </div>
      </main>
    </div>
  );
}
