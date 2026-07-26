"use client";

import { Sparkles, ArrowUpRight, BookOpen, Compass, GraduationCap, Calendar } from "lucide-react";

interface WelcomeScreenProps {
  onSendSuggestion: (message: string) => void;
}

export function WelcomeScreen({ onSendSuggestion }: WelcomeScreenProps) {
  const suggestions = [
    {
      title: "Recommander un roman d'aventure",
      subtitle: "Pour un jeune passionné de récits de voyage",
      query: "Recommande-moi un livre d'aventure captivant pour un adolescent.",
      icon: <Compass className="w-4.5 h-4.5 text-blue-500" />,
    },
    {
      title: "Patrimoine du Bénin",
      subtitle: "Ouvrages clés de notre histoire nationale",
      query: "Quels livres me conseillez-vous pour en savoir plus sur l'histoire du Bénin et le Royaume du Dahomey ?",
      icon: <BookOpen className="w-4.5 h-4.5 text-cyan-500" />,
    },
    {
      title: "Soutien scolaire & Cours",
      subtitle: "Ressources pédagogiques pour le collège/lycée",
      query: "Quelles ressources pédagogiques ou manuels de soutien scolaire proposez-vous pour préparer le BAC ?",
      icon: <GraduationCap className="w-4.5 h-4.5 text-amber-500" />,
    },
    {
      title: "Événements & Clubs de lecture",
      subtitle: "Rejoindre les activités de la bibliothèque CAEB",
      query: "Quels sont les clubs de lecture, horaires et activités prévus cette semaine à la bibliothèque de Natitingou ?",
      icon: <Calendar className="w-4.5 h-4.5 text-indigo-500" />,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-220px)] px-4 py-8 max-w-2xl mx-auto select-none">
      {/* Centered Logo & Greeting */}
      <div className="text-center mb-10 space-y-4 animate-fade-in flex flex-col items-center">
        {/* ChatGPT Style Blue Logo */}
        <div className="w-13 h-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md mb-2 hover:scale-[1.03] transition-transform duration-300">
          <Sparkles className="w-6.5 h-6.5" />
        </div>
        
        <h1 className="text-2xl sm:text-3.5xl font-bold tracking-tight text-foreground">
          Que puis-je faire pour vous aujourd'hui ?
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
          Je suis <span className="font-semibold text-primary">Kossi</span>, l'assistant intelligent de la Bibliothèque CAEB de Natitingou.
        </p>
      </div>

      {/* Suggestion Cards Grid (ChatGPT style 2x2 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full animate-slide-up">
        {suggestions.map((item, index) => {
          return (
            <button
              key={index}
              onClick={() => onSendSuggestion(item.query)}
              className="group flex items-center justify-between p-4.5 rounded-2xl border border-border bg-card hover:bg-muted dark:hover:bg-slate-800/40 text-left transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.99] shadow-sm hover:shadow"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-xl bg-muted dark:bg-slate-800 border border-border group-hover:bg-background transition-colors duration-200 flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-xs.5 mb-0.5 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              
              {/* ChatGPT Style Hover Arrow */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg bg-background text-slate-500 flex-shrink-0 ml-2 border border-border/40">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
