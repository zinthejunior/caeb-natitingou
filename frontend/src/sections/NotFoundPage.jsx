import { Home, AlertTriangle, BookOpen, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useGlobalStats } from "@/hooks/useData";
export function NotFoundPage({ user, onNavigate }) {
  const { stats } = useGlobalStats();
  const bookCount = stats?.books_count?.toLocaleString();
  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24">
        <div className="text-center">
 
          {
    /* Icône */
  }
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-full" />
              <AlertTriangle className="w-16 h-16 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          {
    /* Code */
  }
          <h1 className="font-display text-8xl md:text-9xl font-bold text-accent mb-4">404</h1>

          {
    /* Message */
  }
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-3">Cette page est introuvable</h2>
          <p className="text-lg text-muted mb-12 max-w-md mx-auto leading-relaxed">
            Le lien que vous avez suivi n'existe plus ou a été déplacé. Pas d'inquiétude, le catalogue vous attend.
          </p>

          {
    /* Actions */
  }
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
    onClick={() => onNavigate("home")}
    className="btn-solid gap-2 shadow-medium hover:shadow-elevated hover:-translate-y-0.5 transition-all font-bold sheen relative overflow-hidden"
  >
              <Home className="w-4 h-4" />Retour à l'accueil
            </Button>
            <Button
    onClick={() => onNavigate("catalog")}
    variant="outline"
    className="border-[var(--border-strong)] text-primary hover:bg-[var(--library-surface-alt)] font-semibold"
  >
              Parcourir le catalogue
            </Button>
          </div>

          {
    /* Aide */
  }
          <div className="mt-16 pt-12 border-t border-[var(--border-color)]">
            <h3 className="font-semibold text-primary mb-6">Besoin d'aide ?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
    { icon: BookOpen, label: "Catalogue", desc: bookCount ? `${bookCount} ouvrages à explorer — romans, essais, jeunesse et plus.` : "Un vaste catalogue à explorer — romans, essais, jeunesse et plus.", view: "catalog" },
    { icon: Users, label: "Clubs", desc: "Rejoignez un club de lecture et partagez vos coups de cœur.", view: "clubs" },
    { icon: Calendar, label: "Événements", desc: "Conférences, ateliers, rencontres — le programme de la CAEB.", view: "events" }
  ].map((item) => <button
    key={item.label}
    onClick={() => onNavigate(item.view)}
    className="card group text-center hover:border-[var(--library-accent)]/25 hover:-translate-y-1 transition-all duration-300"
  >
                  <div className="w-10 h-10 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:bg-[var(--library-accent)] group-hover:scale-110 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-accent group-hover:text-[var(--library-on-accent)] transition-colors" />
                  </div>
                  <h4 className="font-semibold text-primary mb-2">{item.label}</h4>
                  <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                </button>)}
            </div>
          </div>
        </div>
      </main>
    </div>;
}
