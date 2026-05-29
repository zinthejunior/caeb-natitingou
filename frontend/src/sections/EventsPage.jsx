/**
 * =============================================================================
 * PAGE DES ÉVÉNEMENTS (EventsPage)
 * =============================================================================
 * 
 * Cette page affiche l'agenda des événements culturels de la bibliothèque :
 * conférences, ateliers, réunions de clubs de lecture, etc.
 * 
 * FONCTIONNALITÉS :
 * - Affichage des événements groupés par mois
 * - Filtrage par type d'événement (clubs, conférences, ateliers)
 * - Inscription/désinscription aux événements
 * - Affichage du nombre de participants
 * 
 * CONCEPTS REACT UTILISÉS :
 * - useState : gestion des filtres et des inscriptions
 * - reduce() : regroupement des événements par mois
 * - Rendu conditionnel : affichage différent selon l'état
 * 
 * STRUCTURE DES DONNÉES :
 * - event.date : date de l'événement (format ISO)
 * - event.type : type d'événement (club, conference, workshop)
 * - event.participantCount : nombre de participants
 * =============================================================================
 */

import { useState } from "react";
import { Calendar, MapPin, Users, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useEvents, useClubs, registerEvent } from "@/hooks/useData";
import { useSEO } from "@/lib/utils";

/**
 * Composant affiché quand il n'y a pas d'événements
 * Montre une illustration de calendrier vide avec un message
 */
function EmptyCalendar() {
  return <div className="empty-state py-20 surface rounded-2xl border border-[var(--border-color)]">
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Calendrier stylisé */}
        <rect x="15" y="25" width="90" height="80" rx="10" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-[var(--library-accent)] opacity-20" />
       <rect x="15" y="25" width="90" height="25" rx="10" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        <rect x="15" y="38" width="90" height="12" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        {/* Crochets du calendrier */}
        <rect x="38" y="16" width="7" height="18" rx="3.5" fill="currentColor" className="text-[var(--library-accent)] opacity-30" />
        <rect x="75" y="16" width="7" height="18" rx="3.5" fill="currentColor" className="text-[var(--library-accent)] opacity-30" />
        {/* Cases des jours */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <rect
    key={i}
    x={22 + i % 3 * 28}
    y={62 + Math.floor(i / 3) * 18}
    width="20"
    height="12"
    rx="4"
    stroke="currentColor"
    strokeWidth="1"
    fill="none"
    className="text-[var(--library-accent)] opacity-12"
  />)}
        {/* Étoile décorative */}
        <path
    d="M60 18 L62 22 L66 22 L63 25 L64 29 L60 27 L56 29 L57 25 L54 22 L58 22 Z"
    fill="currentColor"
    className="text-[var(--library-accent)] opacity-30"
  />
      </svg>
      <h3 className="text-lg font-semibold text-primary">Aucun événement prévu</h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        Nos équipes vous concoctent un programme riche en découvertes. Restez à l&apos;affût de nos prochaines conférences et ateliers !
      </p>
    </div>;
}

/**
 * Composant principal de la page Événements
 * @param {object} user - Informations de l'utilisateur connecté
 * @param {function} onEventClick - Fonction appelée quand on clique sur un événement
 */
export function EventsPage({ user, onEventClick }) {
  // ─── RÉCUPÉRATION DES DONNÉES ──────────────────────────────────────────────
  const { events } = useEvents();  // Liste des événements
  const { clubs } = useClubs();    // Liste des clubs (pour afficher l'organisateur)
  
  // ─── ÉTAT LOCAL ────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState("all"); // Filtre par type
  const [participatingEvents, setParticipatingEvents] = useState(
    events.filter((e) => e.isParticipating).map((e) => e.id)
  );
  
  // SEO
  useSEO("Événements Culturels", "Participez à nos conférences, ateliers et clubs de lecture. Agenda culturel de la bibliothèque CAEB à Natitingou.");
  
  // ─── FILTRAGE DES ÉVÉNEMENTS ───────────────────────────────────────────────
  const filteredEvents = events.filter((e) => filter === "all" || e.type === filter);
  
  /**
   * Gère l'inscription/désinscription à un événement
   * Toggle : si déjà inscrit, annule l'inscription et vice versa
   */
  const handleParticipate = async (eventId) => {
    try {
      await registerEvent(eventId); // Appel API
      if (participatingEvents.includes(eventId)) {
        // Déjà inscrit → annuler
        setParticipatingEvents((prev) => prev.filter((id) => id !== eventId));
        toast.success("Inscription annulée");
      } else {
        // Pas inscrit → inscrire
        setParticipatingEvents((prev) => [...prev, eventId]);
        toast.success("Inscription confirmée !", { description: "Vous recevrez un rappel avant l&apos;événement." });
      }
    } catch (err) {
      toast.error("Erreur lors de l&apos;inscription à l&apos;événement");
    }
  };
  
  // ─── CONFIGURATION DES TYPES D'ÉVÉNEMENTS ──────────────────────────────────
  const typeConfig = {
    club: { label: "Club de lecture", class: "bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20" },
    conference: { label: "Conférence", class: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    workshop: { label: "Atelier", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" }
  };
  
  // ─── REGROUPEMENT DES ÉVÉNEMENTS PAR MOIS ──────────────────────────────────
  // reduce() parcourt le tableau et construit un objet { "janvier 2024": [...], ... }
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const monthKey = new Date(event.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(event);
    return acc;
  }, {});
  
  // Options de filtrage
  const filterOptions = [
    { id: "all", label: "Tous" },
    { id: "club", label: "Clubs" },
    { id: "conference", label: "Conférences" },
    { id: "workshop", label: "Ateliers" }
  ];
  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {
    /* Filtres Modernisés */
  }
        <div className="flex gap-3 overflow-x-auto pb-6 mb-10 -mx-4 px-4 scrollbar-hide">
          {filterOptions.map((f) => <button
    key={f.id}
    onClick={() => setFilter(f.id)}
    className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 border flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-accent/20 tap-feedback ${filter === f.id ? "bg-accent text-white border-accent shadow-glow scale-105" : "glass-effect border-white/10 text-primary hover:border-accent/30 hover:text-accent"}`}
  >
              {f.label}
            </button>)}
        </div>

        {
    /* Événements */
  }
        {filteredEvents.length === 0 ? <EmptyCalendar /> : <div className="space-y-12">
            {Object.entries(groupedEvents).map(([month]) => <section key={month}>
                <h2 className="font-display text-2xl font-bold text-primary mb-8 capitalize flex items-center gap-3">
                  <div className="w-2 h-8 bg-accent rounded-full shadow-glow" />
                  <span className="text-gradient">{month}</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedEvents[month].map((event) => <EventCard
    key={event.id}
    event={event}
    clubs={clubs}
    isParticipating={participatingEvents.includes(event.id)}
    onParticipate={() => handleParticipate(event.id)}
    onClick={() => onEventClick?.(event.id)}
    typeConfig={typeConfig}
  />)}
                </div>
              </section>)}
          </div>}
      </main>
    </div>;
}
function EventCard({ event, clubs, isParticipating, onParticipate, onClick, typeConfig }) {
  const eventDate = new Date(event.date);
  const club = event.clubId ? clubs.find((c) => c.id === event.clubId) : null;
  const type = typeConfig[event.type] || { label: "Événement", class: "bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20" };
  return <div
    onClick={onClick}
    className="glass-effect rounded-[2.5rem] overflow-hidden shadow-card hover:shadow-glow border border-white/10 hover:border-accent/30 hover:-translate-y-2 transition-all duration-500 cursor-pointer group tap-feedback animate-flow-in"
  >

      {
    /* Visuel */
  }
      <div className="relative h-32 surface-alt overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--library-accent)]/15 to-[var(--library-accent)]/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Calendar className="w-14 h-14 text-[var(--library-accent)]/20 group-hover:text-[var(--library-accent)]/30 transition-colors" />
        </div>
        {
    /* Date badge */
  }
        <div className="absolute top-3 left-3 surface rounded-xl p-2 text-center min-w-[48px] shadow-soft border border-[var(--border-color)]">
          <p className="text-[10px] text-muted font-bold uppercase leading-none">
            {eventDate.toLocaleDateString("fr-FR", { month: "short" })}
          </p>
          <p className="text-xl font-bold text-accent leading-tight">{eventDate.getDate()}</p>
        </div>
      </div>

      <div className="p-4">
        <Badge className={`text-xs font-semibold mb-2 border ${type.class}`}>{type.label}</Badge>
        <h3 className="font-semibold text-primary line-clamp-2 mb-3 group-hover:text-accent transition-colors">{event.title}</h3>

        <div className="space-y-1.5 text-sm text-muted mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span>{eventDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à {event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span>{event.location}</span>
          </div>
          {club && <p className="text-xs text-accent font-semibold pl-5">Organisé par {club.name}</p>}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold text-primary">{(event.participantCount ?? event.nbParticipants ?? 0) + (isParticipating ? 1 : 0)}</span>
            <span>participant{(event.participantCount ?? event.nbParticipants ?? 0) > 1 ? "s" : ""}</span>
          </div>
          <Button
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      onParticipate();
    }}
    className={`tap-feedback ${isParticipating ? "border-[var(--library-accent)]/30 text-accent hover:bg-[var(--library-accent)]/10 font-semibold border" : "btn-solid font-semibold shadow-soft hover:shadow-medium transition-all"}`}
    variant={isParticipating ? "outline" : "default"}
  >
            {isParticipating ? <><Check className="w-3.5 h-3.5 mr-1" />Inscrit</> : "Je participe"}
          </Button>
        </div>
      </div>
    </div>;
}
