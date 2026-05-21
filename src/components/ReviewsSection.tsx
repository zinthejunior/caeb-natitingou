// ReviewsSection - Affiche les avis et commentaires sur un livre
import { MessageSquare, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import type { ReviewComment } from '@/types';

interface ReviewsSectionProps {
  bookId: string;
  reviews: ReviewComment[];
  onAddReview?: (rating: number, title: string, comment: string) => void;
  isAuthenticated?: boolean;
}
 
export function ReviewsSection({ reviews, onAddReview, isAuthenticated }: Omit<ReviewsSectionProps, 'bookId'>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmitReview = () => {
    if (title.trim() && comment.trim()) {
      onAddReview?.(rating, title, comment);
      setTitle('');
      setComment('');
      setRating(5);
      setIsExpanded(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* En-tête avec stats */}
      <div>
        <h3 className="text-2xl font-bold text-primary dark:text-library-dark-light mb-4 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-library-primary dark:text-library-dark-accent" />
          Avis ({reviews.length})
        </h3>

        {/* Stats des avis */}
        {reviews.length > 0 && (
          <div className="flex items-center gap-6 mb-6 surface dark:bg-library-dark-secondary rounded-xl p-4">
            <div>
              <div className="text-4xl font-bold text-library-primary dark:text-library-dark-accent">
                {averageRating}
              </div>
              <div className="text-sm text-slate-700 dark:text-library-dark-muted">
                sur 5 ({reviews.length} avis)
              </div>
            </div>

            {/* Distribution des notes */}
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter(r => (r.rating ?? 0) === star).length;
                const percentage = (count / reviews.length) * 100;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-slate-700 dark:text-library-dark-muted w-4">{star}★</span>
                    <div className="flex-1 h-2 bg-muted dark:bg-library-dark-primary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-700 dark:text-library-dark-muted w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ajouter un avis */}
      {isAuthenticated && (
        <div className="surface dark:bg-library-dark-secondary rounded-xl p-4 sm:p-6">
          {!isExpanded ? (
            <Button onClick={() => setIsExpanded(true)} className="w-full" variant="outline">
              ✎ Ajouter votre avis
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-primary dark:text-library-dark-light mb-2">
                  Votre note
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500/50 dark:focus:ring-yellow-500/50 rounded-full p-1 hover:scale-110 ${star <= rating ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                        }`}
                      title={`Évaluer ${star} étoile${star > 1 ? 's' : ''}`}
                      aria-label={`Évaluer ${star} étoile${star > 1 ? 's' : ''}`}
                      aria-pressed={star <= rating}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-semibold text-primary dark:text-library-dark-light mb-2">
                  Titre de votre avis
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Un excellent livre..."
                  className="w-full px-4 py-2 rounded-lg border border-muted dark:border-library-dark-secondary bg-white dark:bg-library-dark-primary text-primary dark:text-library-dark-light placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent"
                />
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-sm font-semibold text-primary dark:text-library-dark-light mb-2">
                  Votre avis
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre opinion sur ce livre..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-muted dark:border-library-dark-secondary bg-white dark:bg-library-dark-primary text-primary dark:text-library-dark-light placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent resize-none"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitReview}
                  disabled={!title.trim() || !comment.trim()}
                  className="flex-1"
                >
                  <span className="truncate">Publier l'avis</span>
                </Button>
                <Button
                  onClick={() => {
                    setIsExpanded(false);
                    setTitle('');
                    setComment('');
                    setRating(5);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <span className="truncate">Annuler</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste des avis */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-slate-700 dark:text-library-dark-muted">
            Aucun avis pour l'instant. Soyez le premier à laisser un avis!
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="surface dark:bg-library-dark-secondary rounded-xl p-4 sm:p-6 border border-muted dark:border-library-dark-secondary/50"
            >
              {/* En-tête */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-library-primary dark:bg-library-dark-accent flex items-center justify-center flex-shrink-0 text-white dark:text-library-dark-bg font-bold">
                    {review.userName ? review.userName[0].toUpperCase() : '?'}
                  </div>

                  {/* Info utilisateur */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-primary dark:text-library-dark-light">
                        {review.userName || 'Utilisateur anonyme'}
                      </h4>
                      {review.isUserReview && (
                        <Badge className="bg-library-primary dark:bg-library-dark-accent text-white text-xs">
                          Mon avis
                        </Badge>
                      )}
                    </div>

                    {/* Note */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={i < (review.rating ?? 0) ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600'}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-library-dark-muted">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('fr-FR') : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Titre et contenu */}
              <div className="mb-3">
                <h5 className="font-semibold text-primary dark:text-library-dark-light mb-1">
                  {review.title}
                </h5>
                <p className="text-sm text-slate-700 dark:text-library-dark-muted line-clamp-3">
                  {review.comment}
                </p>
              </div>

              {/* Engagement */}
              <div className="flex items-center gap-4 pt-3 border-t border-muted dark:border-library-dark-secondary/50">
                <button className="flex items-center gap-1 text-xs text-slate-700 dark:text-library-dark-muted hover:text-library-primary dark:hover:text-library-dark-accent transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  {(review.likes ?? 0) > 0 && `${review.likes}`}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
