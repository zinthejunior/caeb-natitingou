import { useEffect, useRef, useState } from 'react';
import { BookOpen, Users, Calendar, Star, ArrowRight, Mail, Phone, MapPin, Cpu, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export function LandingPage({ onLoginClick, onRegisterClick }: LandingPageProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const booksRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<{ caption: string; src: string } | null>(null);
  // ── Reveal on scroll ──
  useEffect(() => {
    const observer = new IntersectionObserver( 
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-slide-up');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── Infinite auto-scroll gallery ──
  const galleryTrackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = galleryTrackRef.current;
    if (!track) return;
    let animId: number;
    let pos = 0;
    const speed = 0.45;
    const step = () => {
      pos += speed;
      const half = track.scrollWidth / 2;
      if (pos >= half) pos = 0;
      track.style.transform = `translateX(-${pos}px)`;
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    const pause = () => cancelAnimationFrame(animId);
    const resume = () => { animId = requestAnimationFrame(step); };
    track.addEventListener('mouseenter', pause);
    track.addEventListener('mouseleave', resume);
    return () => {
      cancelAnimationFrame(animId);
      track.removeEventListener('mouseenter', pause);
      track.removeEventListener('mouseleave', resume);
    };
  }, []);

  const features = [
    {
      icon: BookOpen,
      title: 'Plus de 12 000 ouvrages à portée de main',
      description: 'Romans, manuels, BD, essais parcourez un catalogue enrichi avec des suggestions adaptées à vos goûts et à votre niveau.',
    },
    {
      icon: Users,
      title: 'Des clubs pour tous les goûts',
      description: "Club de lecture, club d'anglais, club de danse rejoignez une communauté active et apprenez en vous amusant.",
    },
    {
      icon: Calendar,
      title: 'Une vie culturelle toute l\'année',
      description: "Rencontres d'auteurs, ateliers d'écriture, conférences, spectacles : la bibliothèque ne dort jamais.",
    },
    {
      icon: Cpu,
      title: 'Un labo IA, unique dans la région',
      description: "Initiez-vous à l'intelligence artificielle dans notre laboratoire numérique ouvert à tous, gratuit, encadré.",
    },
  ];

  const popularBooks = [
    { title: "L'enfant noir", author: 'Camara Laye', rating: 4.8, cover: '/book-6.jpg' },
    { title: 'Une si longue lettre', author: 'Mariama Bâ', rating: 4.7, cover: '/book-1.jpg' },
    { title: 'Nexus 2084', author: 'A.R. Vasquez', rating: 4.6, cover: '/book-3.jpg' },
    { title: "L'Écho du Silence", author: 'Céline Dubois', rating: 4.5, cover: '/book-2.jpg' },
    { title: 'La Cour des Ombres', author: 'Élise Beaunont', rating: 4.4, cover: '/book-5.jpg' },
  ];

  const testimonials = [
    {
      text: "Le club d'anglais m'a ouvert des portes que je n'aurais pas franchies seul. Je viens ici depuis le lycée.",
      name: 'Karim D.',
      role: 'Étudiant en informatique',
      avatar: '/avarta-1.png',
    },
    {
      text: 'Mes enfants adorent les samedis à la bibliothèque. Ils lisent plus, ils posent plus de questions c\'est magique.',
      name: 'Amina S.',
      role: 'Maman de 3 enfants',
      avatar: '/avarta-2.png',
    },
    {
      text: "La conférence sur l'IA m'a donné envie de me former. J'ai rejoint le labo le lendemain. Je ne regrette rien.",
      name: 'Jean-Pierre M.',
      role: 'Professionnel, 38 ans',
      avatar: '/avarta-3.png',
    },
  ];

  const libraryPhotos = [
    { src: '/25ans.jpg', caption: '25 ans avec la Fondation Vallet' },
    { src: '/1.jpg', caption: 'Salle de lecture' },
    { src: '/club-1.jpg', caption: 'Club de lecture' },
    { src: '/club-2.jpg', caption: 'Ateliers en groupe' },
    { src: '/club-3.jpg', caption: 'Activités jeunesse' },
    { src: '/Club-Danse.jpg', caption: 'Club de danse' },
    { src: '/conférence-eeia2026.jpg', caption: 'Conférence IA 2026' },
    { src: '/Détente-1.jpg', caption: 'Animations extérieures' },
    { src: '/Détente-2.jpg', caption: 'Fête de la lecture' },
    { src: '/Détente-3.jpg', caption: 'Spectacle culturel' },
    { src: '/elève.jpg', caption: 'Espace jeunes' },
  ];

  return (
    <div className="min-h-screen bg-library-bg page-landing">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-[var(--border-color)] adaptive-fg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="CAEB NATITINGOU" className="h-10 w-auto object-contain" />
              <div className="hidden sm:flex flex-col">
                <span data-adaptive className="caeb-brand text-base tracking-widest leading-none">CAEB</span>
                <span data-adaptive className="text-xs text-muted font-medium tracking-wider caeb-brand--solid">Natitingou</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onLoginClick}
                className="text-primary hover:text-accent hover:bg-[var(--library-accent)]/10 font-semibold">
                Connexion
              </Button>
              <Button onClick={onRegisterClick}
                className="btn-solid font-semibold shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition-all sheen relative overflow-hidden">
                S'inscrire
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-full text-accent text-sm font-semibold">
                <Star className="w-4 h-4 fill-current" />
                <span>25 ans au service de la lecture Natitingou, Bénin</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary leading-tight">
                Ouvrez un livre, ouvrez votre monde.{' '}
                <span className="text-accent">L'excellence au cœur de Natitingou</span>
              </h1>

              <div className="space-y-3">
                <p className="text-lg text-muted max-w-lg leading-relaxed">
                  Depuis plus de 25 ans, la <span className="font-semibold text-[var(--library-text)]">CAEB</span> s'engage avec la <span className="font-semibold text-accent">Fondation Vallet</span> pour faire rayonner la culture. 
                  Plongez dans un catalogue de <span className="font-semibold text-[var(--library-text)]">12 000 ouvrages</span> adapté à tous.
                </p>
                <p className="text-base text-muted max-w-lg leading-relaxed">
                  Et préparez l'avenir avec notre{' '}
                  <span className="font-semibold text-accent">laboratoire d'intelligence artificielle</span>
                  , une initiative inédite au nord du Bénin.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={onRegisterClick}
                  className="btn-solid gap-2 group shadow-medium hover:shadow-elevated hover:-translate-y-0.5 transition-all sheen relative overflow-hidden">
                  Commencer ma lecture gratuite
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" onClick={onLoginClick}
                  className="border-[var(--border-strong)] text-primary hover:bg-[var(--library-surface-alt)] font-semibold">
                  J'ai déjà un compte
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex -space-x-3">
                  {['/avarta-1.png', '/avarta-2.png', '/avarta-3.png'].map((src, i) => (
                    <img key={i} src={src} alt="" className="w-10 h-10 rounded-full border-2 border-[var(--library-surface)] object-cover" />
                  ))}
                </div>
                <p className="text-sm text-muted">
                  <span className="font-bold text-accent">+5 000</span> lecteurs nous font confiance
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-[var(--library-accent)]/10 rounded-3xl blur-2xl opacity-60" />
              <img src="/25ans.jpg" alt="25 ans de la Bibliothèque CAEB Natitingou"
                className="relative rounded-2xl shadow-elevated w-full object-cover aspect-[4/3]" />
              <div className="absolute -bottom-6 -left-6 surface rounded-xl shadow-card p-4 animate-float border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--library-accent)]/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary">12 000+ livres</p>
                    <p className="text-xs text-muted">Catalogue enrichi</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 surface rounded-xl shadow-card px-4 py-2 animate-float border border-[var(--border-color)]" style={{ animationDelay: '1s' }}>
                <p className="text-xs font-bold text-accent">Labo IA</p>
                <p className="text-xs text-muted">Unique au nord du Bénin</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BANDEAU CHIFFRES CLÉS ── */}
      <div className="py-6 surface border-y border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16">
            {[
              { value: '12 000+', label: 'Livres disponibles' },
              { value: '5 000+', label: 'Lecteurs actifs' },
              { value: '3 clubs', label: 'Thématiques' },
              { value: '1 labo', label: 'Intelligence artificielle' },
              { value: '25 ans', label: "D'existence" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-2xl font-bold text-accent">{stat.value}</p>
                <p className="text-xs text-muted mt-0.5 font-medium uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── GALERIE AUTO-DÉFILANTE ── */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="font-display text-2xl font-bold text-primary">Notre bibliothèque en images</h2>
          <p className="text-sm text-muted mt-1">Survolez pour mettre en pause, cliquez pour agrandir</p>
        </div>
        <div className="overflow-hidden">
          <div ref={galleryTrackRef} className="flex gap-4 px-4 w-max will-change-transform">
            {[...libraryPhotos, ...libraryPhotos].map((photo, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl flex-shrink-0 w-64 h-44 border border-[var(--border-color)] shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedImage(photo)}
              >
                <img
                  src={photo.src}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="image-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <p className="overlay-text text-sm font-semibold leading-tight">{photo.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedImage.src}
                alt={selectedImage.caption}
                className="w-full rounded-2xl shadow-2xl object-contain max-h-[75vh]"
              />
              <p className="text-white font-semibold text-center mt-4">{selectedImage.caption}</p>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-4 -right-4 w-10 h-10 surface rounded-full flex items-center justify-center shadow-lg hover:bg-[var(--library-accent)] hover:text-[var(--library-on-accent)] transition-colors font-bold text-[var(--library-text)]"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section ref={featuresRef} className="py-20 lg:py-32 surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal-on-scroll opacity-0 translate-y-8">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-4">
              Plus qu'une bibliothèque, un espace de vie
            </h2>
            <p className="text-muted leading-relaxed max-w-xl mx-auto">
              Nous croyons que l'éducation transforme des vies. Découvrez un écosystème conçu pour stimuler votre curiosité, encourager l'échange et vous accompagner vers la réussite.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="reveal-on-scroll opacity-0 translate-y-8 group p-6 rounded-2xl surface-alt border border-[var(--border-color)] hover:surface hover:shadow-card-hover hover:border-[var(--library-accent)]/20 hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-14 h-14 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[var(--library-accent)] group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-7 h-7 text-accent group-hover:text-[var(--library-on-accent)] transition-colors" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LIVRES DU MOMENT ── */}
      <section ref={booksRef} className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12 reveal-on-scroll opacity-0 translate-y-8">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-2">Les livres du moment</h2>
              <p className="text-muted">Ce que lisent vos voisins les ouvrages les plus appréciés de notre communauté</p>
            </div>
            <Button variant="outline" onClick={onLoginClick}
              className="hidden sm:flex border-[var(--border-strong)] text-primary hover:bg-[var(--library-surface-alt)] gap-2 font-semibold">
              Voir tout le catalogue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
            {popularBooks.map((book, index) => (
              <div
                key={book.title}
                className="reveal-on-scroll opacity-0 translate-y-8 group card flex-shrink-0 w-72"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-28 rounded-xl overflow-hidden shadow-medium group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-primary truncate mb-1">{book.title}</h3>
                    <p className="text-sm text-muted mb-3">{book.author}</p>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-accent fill-current" />
                      <span className="text-sm font-bold text-accent">{book.rating}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={onLoginClick}
                      className="mt-3 w-full bg-[var(--library-accent)]/10 text-accent hover:bg-[var(--library-accent)] hover:text-[var(--library-on-accent)] border border-[var(--library-accent)]/20 transition-all text-xs"
                    >
                      Voir le livre
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Button variant="outline" onClick={onLoginClick}
              className="border-[var(--border-strong)] text-primary font-semibold">
              Voir tout le catalogue
            </Button>
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section className="py-20 lg:py-28 surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal-on-scroll opacity-0 translate-y-8">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">
              Ils lisent, ils apprennent, ils témoignent
            </h2>
            <p className="text-muted">La bibliothèque CAEB vue par ses lecteurs</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="reveal-on-scroll opacity-0 translate-y-8 card flex flex-col gap-4"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <Quote className="w-8 h-8 text-[var(--library-accent)]/30 flex-shrink-0" />
                <p className="text-[var(--library-text)] leading-relaxed italic flex-1">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-color)]">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[var(--library-accent)]/20"
                  />
                  <div>
                    <p className="font-semibold text-sm text-primary">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── À PROPOS ── */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="reveal-on-scroll opacity-0 translate-y-8">
              <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">À propos</p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-4">
                Une mission sociale forte, portée par la Fondation Vallet.
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  Soutenue par la bienveillance de la <span className="font-semibold text-[var(--library-text)]">Fondation Vallet</span> depuis un quart de siècle, 
                  la Bibliothèque du CAEB offre à la jeunesse de l'Atacora un cadre d'excellence pour étudier, s'exprimer et se dépasser.
                </p>
                <p>
                  Avec nos salles de lecture apaisantes, notre <span className="font-semibold text-[var(--library-text)]">Wi-Fi gratuit</span>, 
                  et nos nombreuses activités socioculturelles, chaque visiteur est invité à devenir acteur de son propre savoir, sans aucune barrière financière.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { value: '12 000+', label: 'Livres disponibles' },
                  { value: '5 000+', label: 'Lecteurs actifs' },
                  { value: '3 clubs', label: '+ Labo IA' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 surface-alt rounded-xl border border-[var(--border-color)]">
                    <p className="font-display text-xl font-bold text-accent">{stat.value}</p>
                    <p className="text-xs text-muted mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-on-scroll opacity-0 translate-y-8 grid grid-cols-1 gap-4">
              <div className="rounded-2xl overflow-hidden shadow-elevated border border-[var(--border-color)] h-48">
                <img src="/elève.jpg" alt="Activité à la bibliothèque CAEB" className="w-full h-full object-cover" />
              </div>
              {[
                {
                  title: 'Notre Vision',
                  text: "Que chaque habitant de Natitingou quel que soit son âge ou son niveau ait accès au savoir et à la culture.",
                },
                {
                  title: 'Notre Engagement',
                  text: "Ateliers hebdomadaires, rencontres d'auteurs, formations numériques : nous animons votre ville, une page à la fois.",
                },
              ].map((item) => (
                <div key={item.title} className="card">
                  <h3 className="font-display font-semibold text-primary mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--library-accent)]" />
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HORAIRES ── */}
      <section className="py-12 surface border-t border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="surface rounded-2xl p-6 md:p-8 shadow-card border border-[var(--border-color)]">
            <h3 className="font-display text-xl font-semibold text-primary mb-1">Horaires d'ouverture</h3>
            <p className="text-sm text-muted mb-6">
              Nous vous accueillons du lundi au samedi. Pas d'inscription requise pour consulter sur place.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { day: 'Lundi — Vendredi', hours: '08:30 — 18:00', open: true },
                { day: 'Samedi', hours: '08:00 — 16:00', open: true },
                { day: 'Dimanche', hours: 'Fermé', open: false },
              ].map((item) => (
                <div key={item.day} className={`p-4 rounded-xl border ${item.open ? 'surface-alt border-[var(--border-color)]' : 'surface-weak border-[var(--border-color)] opacity-60'}`}>
                  <p className="font-semibold text-primary text-sm">{item.day}</p>
                  <p className={`text-sm mt-1 ${item.open ? 'text-accent font-semibold' : 'text-muted'}`}>{item.hours}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="py-20 lg:py-32 bg-library-bg" id="Contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal-on-scroll opacity-0 translate-y-8">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-4">Nous contacter</h2>
            <p className="text-muted">Une question, une suggestion ou envie de rejoindre un club ? Écrivez-nous.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Mail, title: 'Email', desc: 'Envoyez-nous vos questions', contact: 'contact@caebnatitingou.com', href: 'mailto:contact@caebnatitingou.com' },
              { icon: Phone, title: 'Téléphone', desc: 'Appelez-nous directement', contact: '+229 97 12 34 56', href: 'tel:+22997123456' },
              { icon: MapPin, title: 'Localisation', desc: 'Visitez notre bibliothèque', contact: 'Natitingou, Bénin', href: '#' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="reveal-on-scroll opacity-0 translate-y-8 card text-center group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-16 h-16 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[var(--library-accent)] transition-all duration-300">
                    <Icon className="w-8 h-8 text-accent group-hover:text-[var(--library-on-accent)] transition-colors" />
                  </div>
                  <h3 className="font-display font-semibold text-primary mb-1">{item.title}</h3>
                  <p className="text-sm text-muted mb-3">{item.desc}</p>
                  <a href={item.href} className="text-accent font-semibold hover:opacity-75 transition-opacity text-sm">{item.contact}</a>
                </div>
              );
            })}
          </div>

          <div className="card reveal-on-scroll opacity-0 translate-y-8">
            <h3 className="font-display text-2xl font-bold text-primary mb-6">Formulaire de contact</h3>
            <form className="grid sm:grid-cols-2 gap-5">
              {[
                { label: 'Nom complet', type: 'text', placeholder: 'Votre nom', span: false },
                { label: 'Email', type: 'email', placeholder: 'votre.email@exemple.com', span: false },
                { label: 'Sujet', type: 'text', placeholder: 'Sujet de votre message', span: true },
              ].map((field) => (
                <div key={field.label} className={field.span ? 'sm:col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-primary mb-1.5">{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder}
                    className="w-full h-11 px-4 surface-alt border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 outline-none transition-all" />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-primary mb-1.5">Message</label>
                <textarea placeholder="Votre message..." rows={5}
                  className="w-full px-4 py-3 surface-alt border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 outline-none transition-all resize-none" />
              </div>
              <div className="sm:col-span-2">
                <Button className="btn-solid w-full h-12 font-bold shadow-medium hover:shadow-elevated hover:-translate-y-0.5 transition-all sheen relative overflow-hidden">
                  Envoyer le message
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 lg:py-32 gradient-accent relative overflow-hidden adaptive-fg">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-on-accent mb-4 reveal-on-scroll opacity-0 translate-y-8">
            Prêt à écrire votre propre histoire ?
          </h2>
          <p className="text-lg text-on-accent/80 mb-3 max-w-2xl mx-auto reveal-on-scroll opacity-0 translate-y-8">
            Rejoignez des milliers de lecteurs, accédez à nos clubs et développez vos compétences au labo IA.
          </p>
          <p className="text-base font-semibold text-on-accent mb-10 reveal-on-scroll opacity-0 translate-y-8">
            C'est gratuit. C'est pour vous. Bienvenue chez vous.
          </p>
          <div className="flex flex-wrap justify-center gap-4 reveal-on-scroll opacity-0 translate-y-8">
            <Button size="lg" onClick={onRegisterClick}
              className="bg-[var(--library-surface)] text-[var(--library-accent)] font-bold shadow-elevated hover:shadow-glow hover:-translate-y-1 transition-all gap-2 group">
              Rejoindre l'aventure
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" onClick={onLoginClick}
              className="border-[var(--library-on-accent)]/30 text-on-accent hover:bg-white/10 font-semibold">
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 bg-library-bg border-t border-[var(--border-color)] adaptive-fg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="CAEB" className="h-8 w-auto object-contain" />
              <span className="font-display font-semibold caeb-brand text-base">CAEB Natitingou</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <a href="#" className="hover:text-accent transition-colors">Mentions légales</a>
              <a href="#" className="hover:text-accent transition-colors">Confidentialité</a>
              <a href="#Contact" className="hover:text-accent transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted">&copy; 2026 CAEB Natitingou. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}