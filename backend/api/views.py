"""
views.py — Vues (endpoints) de l'API REST de la bibliothèque CAEB Natitingou.

Chaque ViewSet expose automatiquement les opérations CRUD (list, create, retrieve,
update, destroy) via le routeur DRF configuré dans urls.py.
Les actions personnalisées (@action) ajoutent des endpoints métier spécifiques.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Count, Q
import joblib
import os
import logging
from . import recommandations as reco_engine
from .throttling import InscriptionRateThrottle, ContactRateThrottle, AuthRateThrottle
from . import emails as mail_service

from .models import (
    User, Book, Borrow, Interaction, Notification,
    ReadingClub, Event, News, Review, Reservation,
    ClubContactMessage, ChatSession, ChatMessage,
    ParticipationEvent
)
from .serializers import (
    UserSerializer, UserPasswordSerializer, BookSerializer, BorrowSerializer,
    InteractionSerializer, NotificationSerializer, ReadingClubSerializer,
    EventSerializer, NewsSerializer, ReviewSerializer, ReservationSerializer,
    ClubContactMessageSerializer, ChatSessionSerializer, ChatMessageSerializer,
    ParticipationEventSerializer
)


# On va essayer d'exécuter notre script

# ── INITIALISATION DU MOTEUR DE RECOMMANDATIONS ──────────────

logger = logging.getLogger(__name__)

def _initialiser_modele_recommandations():
    """Charge les composants du modèle de fusion au démarrage."""
    try:
        # Chemin vers le fichier du modèle sauvegardé
        model_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            '..', 'ai_models', 'modele_fusion.pkl'
        )
        
        if os.path.exists(model_path):
            composants = joblib.load(model_path)
            reco_engine.charger(composants)
            logger.info("Modèle de fusion chargé avec succès")
        else:
            logger.warning(f"Fichier du modèle non trouvé à {model_path}")
    except Exception as e:
        logger.error(f"Erreur lors du chargement du modèle: {e}")

# Initialisation au démarrage du module
_initialiser_modele_recommandations()


# ── STATISTIQUES PUBLIQUES ───────────────────────────────────

@api_view(['GET'])
@perm_classes([AllowAny])
def get_public_stats(request):
    """
    Renvoie les statistiques en temps réel pour la Landing Page.
    """
    # On affiche dans la console backend que la fonction commence
    print("Début de l'exécution de get_public_stats()")
    
    from datetime import datetime
    from .models import Book, User
    
    total_books = Book.objects.count()
    total_users = User.objects.count()
    clubs_count = ReadingClub.objects.count()
    news_count = News.objects.count()
    # Le Cyberespace / Lab n'est plus géré dans cette base
    lab_count = 0
    # Expertise CAEB fondée en 1978
    expertise_years = datetime.now().year - 1978
    
    # PRINT DÉBOGAGE: On affiche les valeurs calculées
    print(f"Statistiques calculées - Livres: {total_books}, Utilisateurs: {total_users}")
    print(" Fin de get_public_stats() - Envoi de la réponse.")
    
    return Response({
        'total_books': total_books,
        'books_count': total_books,
        'total_users': total_users,
        'members_count': total_users,
        'expertise_years': expertise_years,
        'years': expertise_years,
        'active_readers': total_users + 500, # Inclus les lecteurs physiques
        'clubs_count': clubs_count,
        'news_count': news_count,
        'lab_count': lab_count,
    })


class GlobalStatsView(APIView):
    """View API pour les statistiques publiques de la landing page."""
    permission_classes = [AllowAny]

    def get(self, request):
        # PRINT DÉBOGAGE: On signale qu'on est entré dans GlobalStatsView
        print(" Entrée dans GlobalStatsView.get()")
        
        
        # get_public_stats a un décorateur @api_view qui s'attend à recevoir une requête Django de base (HttpRequest).
        # Mais dans APIView, 'request' est déjà une requête modifiée par Django Rest Framework (DRF Request).
        # Si on passe 'request' tel quel, DRF plante car il essaie de re-convertir une requête déjà convertie.
        # Solution : On passe request._request, qui contient la requête d'origine de Django.
        print(" Appel de get_public_stats(request._request)")
        return get_public_stats(request._request)


# ── UTILISATEURS ─────────────────────────────────────────────

class RecommendationViewSet(viewsets.ViewSet):
    """
    Endpoint de recommandations personnalisées pour l'utilisateur connecté.
    Utilise le moteur de fusion défini dans backend/api/recommandations.py.
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        n = int(request.query_params.get('n', 10))

        try:
            # Préparer un profil succinct à transmettre au moteur de recommandation
            user_profile = {
                'genres_preferes': getattr(user, 'genres_preferes', []) or [],
                'niveau_etude': getattr(user, 'niveau_etude', None),
                'date_naissance': getattr(user, 'date_naissance', None),
                'intentions': getattr(user, 'intentions', []) or [],
            }

            raw_recommendations = reco_engine.recommander_par_user_id(
                user_id=str(user.id),
                n=n,
                user_profile=user_profile,
            )

            recommendations = []
            for reco in raw_recommendations:
                code_barres = reco.get('Code_barres')
                if code_barres is None:
                    continue

                code_str = str(code_barres)
                book = Book.objects.filter(
                    Q(id=code_str) | Q(codes_barres__icontains=code_str)
                ).first()

                if not book:
                    logger.debug(f"Recommendation skipped — Code_barres {code_barres} absent en base")
                    continue

                book_data = BookSerializer(book).data
                book_data['recommendation_score'] = reco.get('Score', 0)
                book_data['reco_source'] = 'IA'
                recommendations.append(book_data)

            return Response({
                'user_id': str(user.id),
                'recommendations': recommendations,
            })
        except Exception as e:
            logger.error(f"Erreur recommandations pour {user.id}: {e}")
            return Response(
                {'error': 'Erreur lors du calcul des recommandations'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ── UTILISATEURS ─────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour les utilisateurs.
    - La création (inscription) est publique (AllowAny).
    - Toutes les autres actions nécessitent d'être authentifié.
    Actions personnalisées :
      GET  /utilisateurs/me/              → profil de l'utilisateur connecté
      PATCH /utilisateurs/me/update/      → mise à jour du profil
      POST /utilisateurs/me/change-password/ → changement de mot de passe
    """
    queryset         = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        """Inscription ouverte à tous ; le reste nécessite un token JWT valide."""
        if self.action in ['create', 'check_email']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_throttles(self):
        """
        Applique un throttling renforcé sur les actions publiques sensibles :
        - create       : inscription d'un nouveau compte (max 5/min par IP)
        - check_email  : vérification d'existence d'email (max 10/min par IP)
        """
        if self.action == 'create':
            return [InscriptionRateThrottle()]
        if self.action == 'check_email':
            return [AuthRateThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """Renvoie le profil complet de l'utilisateur actuellement connecté."""
        serializer = self.get_serializer(request.user)
        data = serializer.data
        
        # Ajouter les statistiques personnalisées
        user = request.user
        books_read = Interaction.objects.filter(user=user, livre_lu=True).count()
        reviews_posted = Review.objects.filter(user=user).count()
        clubs_joined = ReadingClub.objects.filter(members=user).count()
        
        data['stats'] = {
            'booksRead': books_read,
            'reviewsPosted': reviews_posted,
            'clubsJoined': clubs_joined,
            'eventsAttended': ParticipationEvent.objects.filter(user=user).count()
        }
        
        return Response(data)

    @action(detail=False, methods=['patch'], url_path='me/update')
    def update_me(self, request):
        """Mise à jour partielle du profil (PATCH → seuls les champs fournis sont modifiés)."""
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)



    def create(self, request, *args, **kwargs):
        """
        Inscription d'un nouvel utilisateur.
        Envoie un email de bienvenue après la création du compte.
        En mode DEBUG : l'email s'affiche dans la console Django.
        En production  : envoi réel via SMTP.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Envoi de l'email de bienvenue (non bloquant : l'erreur est loguée, pas levée)
        mail_service.envoyer_email_bienvenue(user)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['post'], url_path='me/change-password')
    def change_password(self, request):
        """
        Changement de mot de passe.
        Vérifie l'ancien mot de passe avant d'appliquer le nouveau.
        """
        serializer = UserPasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Mot de passe mis à jour avec succès.'})

    @action(detail=False, methods=['post'], url_path='check-email', permission_classes=[permissions.AllowAny])
    def check_email(self, request):
        """
        Vérifie si un email ou nom d'utilisateur existe déjà dans la base de données.
        Utilisé lors de l'inscription à l'étape 1.
        """
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email requis.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # On vérifie sur l'email ou sur le nom d'utilisateur (qui sert souvent d'email ici)
        exists = User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists()
        return Response({'exists': exists})


# ── LIVRES ────────────────────────────────────────────────────

from rest_framework.pagination import PageNumberPagination

class LargeResultsSetPagination(PageNumberPagination):
    page_size = 1000
    page_size_query_param = 'page_size'
    max_page_size = 5000

class BookViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour le catalogue de livres.
    Accès public en lecture (AllowAny) pour permettre aux visiteurs
    de parcourir le catalogue sans être connectés.
    """
    queryset           = Book.objects.all()
    serializer_class   = BookSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class   = LargeResultsSetPagination

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def favorite(self, request, pk=None):
        """Ajouter/retirer un livre des favoris de l'utilisateur connecté."""
        book = self.get_object()
        user = request.user
        favorites = user.favorites or []
        if book.id in favorites:
            favorites.remove(book.id)
            status_str = 'removed'
        else:
            favorites.append(book.id)
            status_str = 'added'
        user.favorites = favorites
        user.save()
        return Response({'status': status_str, 'favorites': favorites})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        """Marquer un livre comme lu et créer/mettre à jour une interaction de marquage."""
        import uuid
        book = self.get_object()
        user = request.user
        is_read = request.data.get('is_read', True)

        # Chercher une interaction marquage existante pour ce user+livre
        existing = Interaction.objects.filter(
            user=user, livre=book, type_action='marquage'
        ).first()

        if existing:
            # Mise à jour
            existing.livre_lu = bool(is_read)
            existing.source = request.data.get('source', 'application')
            existing.save(update_fields=['livre_lu', 'source'])
            interaction = existing
        else:
            # Création avec un UUID généré côté serveur
            interaction = Interaction.objects.create(
                id=str(uuid.uuid4()),
                user=user,
                livre=book,
                type_action='marquage',
                livre_lu=bool(is_read),
                source=request.data.get('source', 'application'),
            )

        return Response({
            'status': 'marked_as_read' if interaction.livre_lu else 'unmarked',
            'book_id': book.id,
            'interaction_id': interaction.id,
            'is_read': interaction.livre_lu,
        })

    @action(detail=True, methods=['delete', 'post'], permission_classes=[permissions.IsAuthenticated], url_path='unmark-as-read')
    def unmark_as_read(self, request, pk=None):
        """Retirer le marquage 'lu' d'un livre."""
        book = self.get_object()
        user = request.user
        deleted_count, _ = Interaction.objects.filter(
            user=user, livre=book, type_action='marquage'
        ).delete()
        return Response({
            'status': 'unmarked',
            'book_id': book.id,
            'deleted': deleted_count > 0,
        })

# ── CHOIX DYNAMIQUES (pour les formulaires) ───────────────────

@api_view(['GET'])
@perm_classes([AllowAny])
def choices_view(request):
    """
    Endpoint GET /api/choices/
    Retourne les listes de choix dynamiques extraites de la base de données.
    Optimisé pour limiter les traitements Python superflus.
    """
    from collections import defaultdict

    # Genres distincts
    genres = list(
        Book.objects.exclude(genre__isnull=True).exclude(genre='')
        .values_list('genre', flat=True).distinct().order_by('genre')
    )

    # Sous-genres groupés par genre
    sous_genres_qs = (
        Book.objects.exclude(sous_genre__isnull=True).exclude(sous_genre='')
        .values('genre', 'sous_genre').distinct()
    )
    sous_genres_par_genre = defaultdict(list)
    for row in sous_genres_qs:
        sous_genres_par_genre[row['genre']].append(row['sous_genre'])

    # Niveaux d'étude
    niveaux_db = (
        User.objects.exclude(niveau_etude__isnull=True).exclude(niveau_etude='')
        .values_list('niveau_etude', flat=True).distinct()
    )
    niveaux = sorted({n.capitalize() for n in niveaux_db})

    # Classes groupées par niveau d'étude
    classes_qs = (
        User.objects.exclude(niveau_etude__isnull=True).exclude(classe__isnull=True)
        .exclude(classe='')
        .values('niveau_etude', 'classe').distinct()
    )
    classes_par_niveau = defaultdict(list)
    for row in classes_qs:
        classes_par_niveau[row['niveau_etude'].capitalize()].append(row['classe'])
        
    for n in classes_par_niveau:
        classes_par_niveau[n].sort()

    # Intentions de lecture (base + dynamique)
    intentions_base = [
        "Emprunter des livres physiques",
        "Consulter le catalogue en ligne",
        "Participer aux clubs de lecture",
        "Assister aux événements et conférences",
        "Travailler/Étudier sur place",
        "Découvrir de nouveaux auteurs",
        "Autre",
    ]
    
    import json
    intentions_db = User.objects.exclude(intentions__isnull=True).values_list('intentions', flat=True)
    all_intentions = set(intentions_base)
    for i_json in intentions_db:
        if not i_json: continue
        try:
            i_list = json.loads(i_json) if isinstance(i_json, str) else i_json
            if isinstance(i_list, list):
                all_intentions.update(i_list)
        except Exception:
            pass
            
    intentions = sorted(list(all_intentions))

    return Response({
        'genres':               genres,
        'sous_genres_par_genre': dict(sous_genres_par_genre),
        'niveaux_etude':        niveaux,
        'classes_par_niveau':   dict(classes_par_niveau),
        'intentions':           intentions,
    })


# ── EMPRUNTS ──────────────────────────────────────────────────

class BorrowViewSet(viewsets.ModelViewSet):
    """
    Gestion des emprunts physiques.
    - Les abonnés ordinaires ne voient que leurs propres emprunts.
    - Les bibliothécaires / admins ont accès à l'ensemble des prêts pour gestion.
    """
    serializer_class   = BorrowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtre les emprunts : les utilisateurs normaux ne voient que les leurs,
        les administrateurs / bibliothécaires voient tous les emprunts pour pouvoir les gérer.
        """
        user = self.request.user
        if user.is_staff:
            return Borrow.objects.all().select_related('livre', 'user')
        return Borrow.objects.filter(user=user).select_related('livre')

    def perform_create(self, serializer):
        """
        Enregistre l'emprunt physique en calculant la date_retour_prevue (date_sortie + 14 jours).
        Associe automatiquement l'emprunt à l'utilisateur connecté.
        """
        from datetime import timedelta
        # Récupération ou initialisation de la date de sortie physique
        date_sortie = serializer.validated_data.get('date_sortie')
        if not date_sortie:
            # En secours, on prend la date du jour
            from django.utils.timezone import now
            date_sortie = now().date()
            
        date_retour_prevue = date_sortie + timedelta(days=14)
        serializer.save(user=self.request.user, date_retour_prevue=date_retour_prevue)

    def perform_update(self, serializer):
        """
        Gère le renouvellement (prolongation) d'un emprunt.
        Si la prolongation est demandée et n'a pas encore été faite,
        on ajoute 14 jours à la date de retour prévue.
        """
        instance = serializer.instance
        prolonge = serializer.validated_data.get('renouvele')
        
        if prolonge and not instance.renouvele:
            from datetime import timedelta
            nouvelle_date = instance.date_retour_prevue + timedelta(days=14)
            serializer.save(date_retour_prevue=nouvelle_date)
        else:
            serializer.save()


# ── INTERACTIONS ──────────────────────────────────────────────

class InteractionViewSet(viewsets.ModelViewSet):
    """
    Enregistrement des interactions utilisateur ↔ livre.
    Les interactions sont liées à l'utilisateur connecté et
    utilisées par Kossi pour affiner les recommandations.
    Filtres disponibles via query params :
      ?type_action=marquage  → ne retourne que les marquages
      ?livre_lu=true         → ne retourne que les livres marqués comme lus
    """
    serializer_class   = InteractionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Ne renvoie que les interactions de l'utilisateur connecté, avec filtres optionnels."""
        qs = Interaction.objects.filter(user=self.request.user).select_related('livre')
        
        # Filtre par type d'action (ex: vue, like, marquage, chat_ia)
        type_action = self.request.query_params.get('type_action')
        if type_action:
            qs = qs.filter(type_action=type_action)
        
        # Filtre par statut lu
        livre_lu = self.request.query_params.get('livre_lu')
        if livre_lu is not None:
            qs = qs.filter(livre_lu=(livre_lu.lower() == 'true'))
        
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        """Associe automatiquement l'interaction à l'utilisateur connecté et génère un UUID."""
        import uuid
        serializer.save(user=self.request.user, id=str(uuid.uuid4()))


# ── NOTIFICATIONS ────────────────────────────────────────────

class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notifications de l'utilisateur connecté.
    Ex: rappel de retour de livre après 7 jours d'emprunt.
    """
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Ne renvoie que les notifications de l'utilisateur connecté."""
        return Notification.objects.filter(user=self.request.user)


# ── CLUBS DE LECTURE ──────────────────────────────────────────

class ReadingClubViewSet(viewsets.ModelViewSet):
    """
    Gestion des clubs de lecture.
    Lecture publique (AllowAny) ; les actions d'adhésion nécessitent un compte.
    """
    queryset           = ReadingClub.objects.all()
    serializer_class   = ReadingClubSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        """
        POST /clubs/{id}/join/
        Inscrit l'utilisateur au club via la relation ManyToMany 'members'
        et maintient la liste followed_clubs de l'utilisateur en synchronisation.
        """
        club = self.get_object()
        user = request.user
        
        # Vérification via la relation ManyToMany (source de vérité)
        if not club.members.filter(pk=user.pk).exists():
            # Ajout à la relation ManyToMany (persisté en BDD)
            club.members.add(user)
            club.member_count = club.members.count()  # Recalcule depuis la BDD
            club.save()
            
            # Synchronisation du cache JSON sur l'utilisateur
            followed = user.followed_clubs or []
            if club.id not in followed:
                followed.append(club.id)
                user.followed_clubs = followed
                user.save(update_fields=['followed_clubs'])
            
            msg = 'inscrit au club'
        else:
            msg = 'déjà membre'
        
        return Response({'status': msg, 'memberCount': club.member_count, 'isJoined': True})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        """
        POST /clubs/{id}/leave/
        Désinscrit l'utilisateur du club via ManyToMany et met à jour followed_clubs.
        """
        club = self.get_object()
        user = request.user
        
        if club.members.filter(pk=user.pk).exists():
            # Suppression de la relation ManyToMany
            club.members.remove(user)
            club.member_count = club.members.count()  # Recalcule depuis la BDD
            club.save()
            
            # Synchronisation du cache JSON sur l'utilisateur
            followed = user.followed_clubs or []
            if club.id in followed:
                followed.remove(club.id)
                user.followed_clubs = followed
                user.save(update_fields=['followed_clubs'])
            
            msg = 'désinscrit du club'
        else:
            msg = 'pas membre'
        
        return Response({'status': msg, 'memberCount': club.member_count, 'isJoined': False})

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.AllowAny],
        throttle_classes=[ContactRateThrottle],  # Max 10 messages/min par IP
    )
    def contact(self, request, pk=None):
        """
        POST /clubs/{id}/contact/
        Envoie un message de contact au responsable du club.
        Accessible sans compte (AllowAny) mais limité par IP pour éviter le spam.
        """
        club = self.get_object()
        serializer = ClubContactMessageSerializer(data={**request.data, 'clubId': pk})
        serializer.is_valid(raise_exception=True)
        msg = ClubContactMessage(
            club=club,
            user=request.user if request.user.is_authenticated else None,
            nom=request.data.get('nom', ''),
            email=request.data.get('email', ''),
            message=request.data.get('message', ''),
        )
        msg.save()
        return Response({'status': 'Message envoyé avec succès.'}, status=status.HTTP_201_CREATED)


# ── ÉVÉNEMENTS ────────────────────────────────────────────────

class EventViewSet(viewsets.ModelViewSet):
    """
    Gestion de l'agenda des événements.
    Lecture publique ; l'inscription à un événement nécessite un compte.
    """
    queryset           = Event.objects.all()
    serializer_class   = EventSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def register(self, request, pk=None):
        """
        POST /evenements/{id}/register/
        Inscrit l'utilisateur à l'événement et incrémente le compteur de participants.
        """
        event = self.get_object()
        event.participant_count += 1
        event.save()
        return Response({'status': "inscrit à l'événement", 'participantCount': event.participant_count})


# ── ACTUALITÉS ───────────────────────────────────────────────

class NewsViewSet(viewsets.ModelViewSet):
    """
    Articles d'actualité de la bibliothèque.
    Triés du plus récent au plus ancien. Lecture publique.
    """
    queryset           = News.objects.all().order_by('-date')
    serializer_class   = NewsSerializer
    permission_classes = [permissions.AllowAny]


# ── AVIS / NOTATION ───────────────────────────────────────────

class ReviewViewSet(viewsets.ModelViewSet):
    """
    Avis et notes laissés par les utilisateurs sur les livres.
    - La lecture est publique (tout le monde peut voir les avis).
    - L'écriture nécessite d'être connecté (IsAuthenticatedOrReadOnly).
    Filtrage : GET /avis/?book={id} → avis d'un livre spécifique.
    """
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """Filtre optionnellement par livre via le paramètre `book` dans l'URL."""
        qs = Review.objects.select_related('user', 'livre')
        book_id = self.request.query_params.get('book')
        if book_id:
            qs = qs.filter(livre_id=book_id)
        return qs

    def perform_create(self, serializer):
        """
        Crée un avis en récupérant les données du corps de la requête.
        Accepte `bookId` ou `book` pour l'ID du livre,
        et `rating` ou `note` pour la note.
        """
        livre_id = self.request.data.get('bookId') or self.request.data.get('book')
        note     = self.request.data.get('rating') or self.request.data.get('note')
        comment  = self.request.data.get('comment') or self.request.data.get('commentaire', '')
        livre    = Book.objects.get(pk=livre_id)
        Review.objects.create(user=self.request.user, livre=livre, note=note, commentaire=comment)


# ── RÉSERVATIONS ─────────────────────────────────────────────

class ReservationViewSet(viewsets.ModelViewSet):
    """
    Réservations de livres par les membres.
    Règles métier :
      - Seuls les utilisateurs avec type_compte='membre' peuvent réserver.
      - Un livre avec exemplaires <= 0 ne peut pas être réservé.
    """
    serializer_class   = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Ne retourne que les réservations de l'utilisateur connecté."""
        return Reservation.objects.filter(user=self.request.user).select_related('livre')

    def perform_create(self, serializer):
        """
        Crée une réservation après vérification des règles métier :
        1. L'utilisateur doit être membre.
        2. Le livre doit avoir au moins 1 exemplaire disponible.
        """
        from rest_framework.exceptions import PermissionDenied, ValidationError

        # Vérification du statut membre
        if self.request.user.type_compte != 'membre':
            raise PermissionDenied("Seuls les membres peuvent faire une demande d'emprunt (réservation).")

        livre_id = (self.request.data.get('book')
                    or self.request.data.get('livre')
                    or self.request.data.get('bookId'))
        livre = Book.objects.get(pk=livre_id)

        # Vérification du stock d'exemplaires
        if livre.exemplaires <= 0:
            raise ValidationError("Ce livre n'a plus d'exemplaires disponibles.")

        Reservation.objects.create(user=self.request.user, livre=livre)


class ParticipationEventViewSet(viewsets.ModelViewSet):
    """
    Gestion des inscriptions aux événements.
    """
    serializer_class   = ParticipationEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return ParticipationEvent.objects.select_related('user', 'event').all().order_by('-date_inscription')
        return ParticipationEvent.objects.filter(user=user).select_related('event').order_by('-date_inscription')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── MESSAGES DE CONTACT (admin uniquement) ────────────────────

class ClubContactMessageViewSet(viewsets.ModelViewSet):
    """
    Messages de contact reçus via les formulaires des clubs.
    Accessible uniquement aux administrateurs (IsAdminUser).
    """
    serializer_class   = ClubContactMessageSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset           = ClubContactMessage.objects.all().order_by('-created_at')


# ── SESSIONS DE CHAT (Kossi) ──────────────────────────────────

class ChatSessionViewSet(viewsets.ModelViewSet):
    """
    Gestion des sessions de chat avec Kossi.
    Chaque utilisateur ne voit que ses propres conversations.
    Action personnalisée : POST /chat/{id}/messages/ → ajouter un message.
    """
    serializer_class   = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Charge les sessions avec leurs messages (prefetch pour éviter les requêtes N+1)."""
        return ChatSession.objects.filter(user=self.request.user).prefetch_related('messages')

    def perform_create(self, serializer):
        """Associe automatiquement la nouvelle session à l'utilisateur connecté."""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='messages')
    def add_message(self, request, pk=None):
        """
        POST /chat/{id}/messages/
        Ajoute un message (utilisateur ou Kossi) à une session de chat existante.
        Corps attendu : { "role": "user"|"assistant", "content": "..." }
        """
        session = self.get_object()
        role    = request.data.get('role', 'user')
        content = request.data.get('content', '')

        if not content:
            return Response({'error': 'Contenu requis'}, status=status.HTTP_400_BAD_REQUEST)

        msg = ChatMessage.objects.create(session=session, role=role, content=content)
        return Response(ChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


# ── Custom Authentication Views (Cookies HttpOnly) ──
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

def _cookie_security(settings):
    """Retourne (secure, samesite) selon l'environnement."""
    if settings.DEBUG:
        # En développement HTTP, SameSite=Lax sans Secure pour que le navigateur
        # accepte de créer ET supprimer les cookies correctement.
        return False, 'Lax'
    # En production HTTPS, SameSite=None;Secure est requis pour le cross-origin.
    return True, 'None'


def set_jwt_cookies(response, access_token, refresh_token):
    from django.conf import settings
    secure, samesite = _cookie_security(settings)
    response.set_cookie(
        key='access',
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path='/',
        max_age=3600 * 24
    )
    if refresh_token:
        response.set_cookie(
            key='refresh',
            value=refresh_token,
            httponly=True,
            secure=secure,
            samesite=samesite,
            path='/',
            max_age=3600 * 24 * 7
        )
    return response

class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            response.data['message'] = "Connexion réussie"
            response = set_jwt_cookies(response, access_token, refresh_token)
        return response

class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        from django.conf import settings
        refresh_token = request.COOKIES.get('refresh')
        if refresh_token:
            # Injecter le refresh token dans les data pour que TokenRefreshView le valide
            request.data['refresh'] = refresh_token

        secure, samesite = _cookie_security(settings)

        try:
            response = super().post(request, *args, **kwargs)
        except Exception as exc:
            response = Response(
                {"detail": "Token de rafraîchissement invalide ou utilisateur introuvable."},
                status=status.HTTP_401_UNAUTHORIZED
            )
            response.delete_cookie('access', path='/', samesite=samesite, secure=secure)
            response.delete_cookie('refresh', path='/', samesite=samesite, secure=secure)
            return response

        if response.status_code == 200:
            access_token = response.data.get('access')
            new_refresh = response.data.get('refresh', refresh_token)
            response.data['message'] = "Rafraîchissement réussi"
            response = set_jwt_cookies(response, access_token, new_refresh)
        else:
            if refresh_token:
                response.delete_cookie('access', path='/', samesite=samesite, secure=secure)
                response.delete_cookie('refresh', path='/', samesite=samesite, secure=secure)
        return response

class LogoutView(APIView):
    # permission_classes vide : l'access token peut etre expire au moment de la deconnexion.
    # On n'exige pas d'etre authentifie, on lit juste le cookie refresh et on le blackliste.
    permission_classes = []

    def post(self, request):
        from django.conf import settings
        refresh_token = request.COOKIES.get('refresh')

        # Blacklister le token AVANT d'envoyer la réponse
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # Token déjà expiré ou invalide

        secure, samesite = _cookie_security(settings)
        response = Response({"message": "Deconnexion reussie"}, status=200)
        response.delete_cookie('access', path='/', samesite=samesite, secure=secure)
        response.delete_cookie('refresh', path='/', samesite=samesite, secure=secure)
        return response
