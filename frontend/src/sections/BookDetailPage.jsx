import { useState, useEffect } from "react";
import { Star, BookOpen, FileText, MessageCircle, ThumbsUp, Flag, Crown, Lock, ChevronLeft, Heart, CheckCircle2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { ApiImage } from "@/components/ApiImage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { reserverLivre, useReviews, useBook, postReview, marquerCommeLu, marquerCommeNonLu, useLivresLus, appelAPI } from "@/hooks/useData";
import { useSEO } from "@/lib/utils";
import { useAuthentification } from "@/hooks/useAuthentification";
export function BookDetailPage({ user, onToggleFavorite }) {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { book, isLoading: isBookLoading } = useBook(bookId);
  const { data: initialReviews, reload: reloadReviews } = useReviews(bookId);
  const { recupererUtilisateur } = useAuthentification();
  const { livresLusIds, recharger: rechargerLivresLus } = useLivresLus();
  const [estLu, setEstLu] = useState(false);
  const [marquagePending, setMarquagePending] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [likedReviews, setLikedReviews] = useState([]);
  useEffect(() => {
    if (initialReviews) setReviews(initialReviews);
  }, [initialReviews]);
  // Synchroniser l'état "lu" avec la liste des livres lus
  useEffect(() => {
    if (bookId && livresLusIds) {
      setEstLu(livresLusIds.has(bookId));
    }
  }, [bookId, livresLusIds]);
  useEffect(() => {
    if (bookId && user) {
      appelAPI('/interactions/', {
        method: 'POST',
        body: JSON.stringify({ livre: bookId, type_action: 'vue' })
      }).catch((err) => {
        console.error("Erreur lors de l'enregistrement de l'interaction vue:", err);
      });
    }
  }, [bookId, user]);
  useSEO(book?.titre || "Détails du livre", book?.synopsis?.slice(0, 160));
  if (isBookLoading) return <div className="min-h-screen bg-library-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>;
  if (!book) return null;
  const handleReserve = async () => {
    if (!user.estMembre) {
      toast.error("Réservation réservée aux membres", { description: "Devenez membre pour réserver des livres" });
      return;
    }
    try {
      await reserverLivre(bookId);
      toast.success("Livre réservé avec succès !", { description: "Vous pouvez venir le chercher à la bibliothèque" });
    } catch (err) {
      toast.error("Erreur lors de la réservation");
    }
  };
  const handleSubmitReview = async () => {
    if (userRating === 0) {
      toast.error("Veuillez donner une note");
      return;
    }
    try {
      await postReview(bookId, userRating, userReview);
      toast.success("Avis publié avec succès !");
      setIsWritingReview(false);
      setUserRating(0);
      setUserReview("");
      void reloadReviews();
      if (recupererUtilisateur) {
        void recupererUtilisateur();
      }
    } catch (err) {
      toast.error("Erreur lors de la publication de l'avis");
    }
  };
  const handleLikeReview = (reviewId) => {
    if (likedReviews.includes(reviewId)) {
      setLikedReviews((prev) => prev.filter((id) => id !== reviewId));
    } else {
      setLikedReviews((prev) => [...prev, reviewId]);
    }
  };
  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar utilisateur={user} />

      {
    /* Bouton retour */
  }
      <div className="fixed top-20 left-4 sm:left-6 z-40">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl surface border border-[var(--border-color)] text-primary shadow-card hover:shadow-card-hover hover:border-[var(--library-accent)]/25 transition-all group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline text-sm font-semibold">Retour</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {
    /* Header du livre avec Mesh Gradient Immersif */
  }
        <div className="grid lg:grid-cols-3 gap-12 mb-12 animate-flow-in">
          {
    /* Couverture avec effet de profondeur */
  }
          <div className="lg:col-span-1 flex justify-center">
            <div className="relative w-full max-w-xs group">
              <div className="absolute inset-0 bg-accent/20 rounded-[2.5rem] blur-3xl scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="w-full aspect-[2/3] surface-alt rounded-[2rem] overflow-hidden shadow-elevated relative z-10 transition-transform duration-500 group-hover:scale-[1.02] border border-white/10">
                <ApiImage
    src={book.couverture}
    alt={book.titre}
    fallback="/default_cover.png"
    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
  />
                
                <button
    onClick={(e) => {
      e.stopPropagation();
      onToggleFavorite?.(bookId);
    }}
    className="absolute top-4 right-4 w-12 h-12 glass-effect border border-white/20 rounded-full flex items-center justify-center shadow-elevated hover:scale-110 hover:shadow-glow transition-all tap-feedback z-20"
  >
                  <Heart className={`w-6 h-6 transition-colors ${(user?.favoris?.includes(bookId) || user?.favorites?.includes(bookId)) ? "text-red-500 fill-current" : "text-white/70"}`} />
                </button>
                
                {book.exemplaires <= 0 && <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <Lock className="w-10 h-10 text-white/50 mb-3" />
                    <span className="text-white text-lg font-bold tracking-tight">Actuellement emprunté</span>
                  </div>}
              </div>
            </div>
          </div>

          {
    /* Informations */
  }
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h1 className="font-display text-4xl font-bold text-primary mb-2">{book.titre}</h1>
              <p className="text-xl text-muted">{book.auteur}</p>
            </div>

            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-accent fill-current" />
              <span className="font-bold text-primary text-lg">{book.note}</span>
              <span className="text-muted">({book.nbAvis} avis)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="surface-alt border border-[var(--border-color)] text-primary font-semibold">{book.genre}</Badge>
              <Badge variant="outline" className="border-[var(--border-color)] text-muted font-semibold">{book.annee}</Badge>
              {book.estNouveau && <Badge className="bg-[var(--library-accent)] text-[var(--library-on-accent)] font-bold">Nouveau</Badge>}
              {book.exemplaires > 0 ? <Badge className="bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 font-semibold">Disponible</Badge> : <Badge variant="destructive">Indisponible</Badge>}
            </div>

            {
    /* Synopsis court */
  }
            {book.synopsis && <p className="text-muted leading-relaxed max-w-prose">{book.synopsis.slice(0, 200)}…</p>}

            {
    /* Actions Modernisées */
  }
            <div className="flex flex-wrap gap-4 pt-4">
              {user.estMembre ? book.exemplaires > 0 ? <Button
    size="lg"
    onClick={handleReserve}
    className="btn-solid h-14 px-10 rounded-2xl gap-3 shadow-glow hover:shadow-elevated hover:-translate-y-1 transition-all font-bold text-lg"
  >
                    <BookOpen className="w-6 h-6" />Réserver maintenant
                  </Button> : <Button
    size="lg"
    variant="outline"
    disabled
    className="h-14 px-10 rounded-2xl border-[var(--border-color)] text-muted gap-3 font-bold opacity-60"
  >
                    <Lock className="w-6 h-6" />Indisponible
                  </Button> : <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/profile")}
                    className="h-14 px-10 rounded-2xl border-accent/30 text-accent gap-3 font-bold hover:bg-accent/5 animate-pulse-soft"
                  >
                  <Crown className="w-6 h-6" />Devenir Membre pour réserver
                </Button>}
              <Button
    size="lg"
    variant={estLu ? "default" : "ghost"}
    disabled={marquagePending}
    onClick={async () => {
      if (marquagePending) return;
      setMarquagePending(true);
      try {
        if (estLu) {
          // Démarquer
          await marquerCommeNonLu(bookId);
          setEstLu(false);
          toast.info("❌ Livre démarqué", { description: "Retiré de vos livres lus." });
        } else {
          // Marquer comme lu
          await marquerCommeLu(bookId, true);
          setEstLu(true);
          toast.success("✅ Livre marqué comme lu !", { description: "Votre historique de lecture a été mis à jour." });
        }
        await rechargerLivresLus();
      } catch (err) {
        console.error("Erreur marquage:", err);
        toast.error("Erreur lors de la mise à jour");
      } finally {
        setMarquagePending(false);
      }
    }}
    className={`h-14 px-8 rounded-2xl font-bold gap-3 transition-all ${
      estLu
        ? "bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/25"
        : "text-muted hover:text-accent hover:bg-accent/5"
    }`}
  >
                {estLu
                  ? <><CheckCircle2 className="w-6 h-6" />Lu ✓</>
                  : <><FileText className="w-6 h-6" />Marquer comme lu</>
                }
              </Button>
            </div>
          </div>
        </div>

        {
    /* Onglets */
  }
        <Tabs
    value={activeTab}
    onValueChange={setActiveTab}
    className="surface rounded-2xl shadow-card border border-[var(--border-color)]"
  >
          <div className="border-b border-[var(--border-color)] px-6">
            <TabsList className="w-auto bg-transparent border-b-0 gap-8 h-auto p-0">
              {[
    { value: "details", label: "Détails du livre" },
    { value: "reviews", label: `Avis (${reviews.length})` }
  ].map((tab) => <TabsTrigger
    key={tab.value}
    value={tab.value}
    className="rounded-none border-b-2 border-transparent px-0 py-4 font-semibold data-[state=active]:border-[var(--library-accent)] data-[state=active]:text-accent data-[state=active]:bg-transparent text-muted"
  >
                  {tab.label}
                </TabsTrigger>)}
            </TabsList>
          </div>

          <div className="p-6">
            {
    /* Détails */
  }
            <TabsContent value="details" className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-5">
                {[
    { label: "Auteur", value: book.auteur },
    { label: "Genre", value: book.genre },
    { label: "Sous-genre", value: book.sous_genre },
    { label: "Année", value: book.annee },
    { label: "Pages", value: book.nbPages },
    { label: "Section", value: book.section },
    { label: "Localisation (Cote)", value: book.localisation }
  ].filter((i) => i.value && String(i.value).trim() !== "").map((item) => <div key={item.label} className="p-4 surface-alt rounded-xl border border-[var(--border-color)]">
                    <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-lg text-primary font-semibold">{item.value}</p>
                  </div>)}
              </div>
              
              {book.motsCles && book.motsCles.trim() !== "" && <div className="border-t border-[var(--border-color)] pt-6">
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Mots-clés</h3>
                  <div className="flex flex-wrap gap-2">
                    {book.motsCles.split(",").map((mot, idx) => <Badge key={idx} variant="outline" className="border-[var(--border-color)] text-primary">
                        {mot.trim()}
                      </Badge>)}
                  </div>
                </div>}
              {book.synopsis && <div className="border-t border-[var(--border-color)] pt-6">
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent" />Synopsis complet
                  </h3>
                  <p className="text-muted leading-relaxed">{book.synopsis}</p>
                </div>}
            </TabsContent>

            {
    /* Avis */
  }
            <TabsContent value="reviews" className="space-y-5">
              {!isWritingReview ? <Button
    onClick={() => setIsWritingReview(true)}
    variant="outline"
    className="w-full font-semibold gap-2 border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30 hover:text-accent"
  >
                  <MessageCircle className="w-4 h-4" />Écrire un avis
                </Button> : <div className="surface-alt rounded-2xl p-5 space-y-4 border border-[var(--border-color)]">
                  <div>
                    <label className="text-sm font-semibold text-primary block mb-2">Votre note</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => <button
    key={star}
    onClick={() => setUserRating(star)}
    className="transition-transform hover:scale-125"
  >
                          <Star className={`w-7 h-7 transition-colors ${star <= userRating ? "fill-[var(--library-accent)] text-[var(--library-accent)]" : "text-[var(--border-color)]"}`} />
                        </button>)}
                    </div>
                  </div>
                  <textarea
    placeholder="Qu'avez-vous pensé de ce livre ? Votre avis aide les autres lecteurs."
    value={userReview}
    onChange={(e) => setUserReview(e.target.value)}
    rows={4}
    className="w-full px-4 py-3 surface border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:outline-none focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 resize-none"
  />
                  <div className="flex gap-3">
                    <Button onClick={handleSubmitReview} className="flex-1 btn-solid font-bold shadow-soft hover:shadow-medium transition-all">Publier</Button>
                    <Button
    onClick={() => setIsWritingReview(false)}
    variant="outline"
    className="flex-1 border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30 font-semibold"
  >Annuler</Button>
                  </div>
                </div>}

              <div className="space-y-4">
                {reviews.map((review) => <ReviewCard
    key={review.id}
    review={review}
    isLiked={likedReviews.includes(review.id)}
    onLike={() => handleLikeReview(review.id)}
    onReport={() => toast.success("Avis signalé", { description: "Notre équipe va examiner cet avis" })}
  />)}
                {reviews.length === 0 && <div className="text-center py-10 surface-alt rounded-xl border border-[var(--border-color)]">
                    <MessageCircle className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-muted">Personne n'a encore partagé son avis. Soyez le premier !</p>
                  </div>}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>;
}
function ReviewCard({ review, isLiked, onLike, onReport }) {
  if (!review) return null; // Sécurité : vérifier que review existe
  
  const user = review.user || {}; // Utiliser un objet vide par défaut
  const firstName = user.firstName || user.prenom || "Utilisateur";
  const lastName = user.lastName || user.nom || "";
  const avatar = user.avatar || user.photo || "/avatar-1.jpg";
  const rating = review.rating || review.note || 0;
  const comment = review.comment || review.avis || "";
  const likes = review.likes || 0;
  
  const reviewDate = new Date(review.createdAt || review.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  
  return <div className="surface-alt rounded-xl p-4 border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all">
      <div className="flex items-start gap-3">
        <img
    src={avatar}
    alt={firstName}
    className="w-10 h-10 rounded-full object-cover border-2 border-[var(--border-color)]"
  />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <p className="font-semibold text-primary text-sm">{firstName} {lastName}</p>
              <div className="flex items-center gap-2 text-xs text-muted">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`w-3 h-3 ${star <= rating ? "fill-[var(--library-accent)] text-[var(--library-accent)]" : "text-[var(--border-color)]"}`} />)}
                </div>
                <span>{reviewDate}</span>
              </div>
            </div>
            <button onClick={onReport} className="text-muted hover:text-primary transition-colors p-1">
              <Flag className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted mt-2 leading-relaxed">{comment}</p>
          <button
    onClick={onLike}
    className={`flex items-center gap-1.5 text-sm transition-colors mt-3 font-medium ${isLiked ? "text-accent" : "text-muted hover:text-primary"}`}
  >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span>{likes + (isLiked ? 1 : 0)}</span>
          </button>
        </div>
      </div>
    </div>;
}
