from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import (
    User, Book, Borrow, Interaction, Notification,
    ReadingClub, Event, News, Review, Reservation,
    ClubContactMessage, ChatSession, ChatMessage,
    LabStation, LabReservation, ParticipationEvent
)
from .kossi_ai import kossi_instance
from .serializers import (
    UserSerializer, UserPasswordSerializer, BookSerializer, BorrowSerializer,
    InteractionSerializer, NotificationSerializer, ReadingClubSerializer,
    EventSerializer, NewsSerializer, ReviewSerializer, ReservationSerializer,
    ClubContactMessageSerializer, ChatSessionSerializer, ChatMessageSerializer,
    LabStationSerializer, LabReservationSerializer, ParticipationEventSerializer
)
from rest_framework.views import APIView


class UserViewSet(viewsets.ModelViewSet):
    queryset         = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='me/update')
    def update_me(self, request):
        old_type = request.user.type_compte
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Notification si demande d'adhésion
        if old_type != 'en_attente' and user.type_compte == 'en_attente':
            import uuid
            Notification.objects.create(
                id=str(uuid.uuid4())[:20],
                user=user,
                type_notif='demande_adhesion',
                message="Votre demande d'adhésion a été reçue et est en cours de traitement par nos bibliothécaires."
            )
        return Response(serializer.data)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_type = instance.type_compte
        user = serializer.save()
        
        # Notification si adhésion confirmée par admin
        if old_type == 'en_attente' and user.type_compte == 'membre':
            import uuid
            Notification.objects.create(
                id=str(uuid.uuid4())[:20],
                user=user,
                type_notif='adhesion_confirmee',
                message="Félicitations ! Votre adhésion a été confirmée. Vous êtes maintenant membre de la bibliothèque CAEB."
            )
    @action(detail=False, methods=['post'], url_path='me/change-password')
    def change_password(self, request):
        serializer = UserPasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Mot de passe mis à jour avec succès.'})


class BookViewSet(viewsets.ModelViewSet):
    queryset         = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def favorite(self, request, pk=None):
        """Toggle un livre dans les favoris de l'utilisateur (persisté en BDD)."""
        user = request.user
        book_id = str(pk)
        favorites = list(user.favorites or [])
        if book_id in favorites:
            favorites.remove(book_id)
            is_fav = False
        else:
            favorites.append(book_id)
            is_fav = True
        user.favorites = favorites
        user.save(update_fields=['favorites'])
        return Response({'isFavorite': is_fav, 'favorites': favorites})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def mark_read(self, request, pk=None):
        """Marque un livre comme lu (ou non lu) — persisté via Interaction."""
        import uuid
        book = self.get_object()
        is_read = request.data.get('is_read', True)
        interaction, created = Interaction.objects.get_or_create(
            user=request.user,
            livre=book,
            type_action='marquage',
            defaults={
                'id': str(uuid.uuid4())[:20],
                'livre_lu': is_read,
                'source': 'application',
            }
        )
        if not created:
            interaction.livre_lu = is_read
            interaction.save(update_fields=['livre_lu'])
        return Response({'isRead': interaction.livre_lu, 'bookId': str(pk)})


class BorrowViewSet(viewsets.ModelViewSet):
    serializer_class   = BorrowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Borrow.objects.filter(user=self.request.user).select_related('livre')


class InteractionViewSet(viewsets.ModelViewSet):
    serializer_class   = InteractionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Interaction.objects.filter(user=self.request.user).select_related('livre')
        # Filtrage optionnel
        type_action = self.request.query_params.get('type_action')
        livre_lu    = self.request.query_params.get('livre_lu')
        if type_action:
            qs = qs.filter(type_action=type_action)
        if livre_lu is not None:
            qs = qs.filter(livre_lu=(livre_lu.lower() == 'true'))
        return qs.order_by('-id')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class ReadingClubViewSet(viewsets.ModelViewSet):
    queryset           = ReadingClub.objects.all()
    serializer_class   = ReadingClubSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        club = self.get_object()
        if not club.members.filter(pk=request.user.pk).exists():
            club.members.add(request.user)
            club.member_count += 1
            club.save()
            return Response({'status': 'inscrit au club', 'memberCount': club.member_count, 'isJoined': True})
        return Response({'status': 'déjà membre', 'memberCount': club.member_count, 'isJoined': True})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        club = self.get_object()
        if club.members.filter(pk=request.user.pk).exists():
            club.members.remove(request.user)
            club.member_count = max(0, club.member_count - 1)
            club.save()
            return Response({'status': 'quitté le club', 'memberCount': club.member_count, 'isJoined': False})
        return Response({'status': 'pas membre', 'memberCount': club.member_count, 'isJoined': False})

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def contact(self, request, pk=None):
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


class EventViewSet(viewsets.ModelViewSet):
    queryset           = Event.objects.all()
    serializer_class   = EventSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def register(self, request, pk=None):
        event = self.get_object()
        participation, created = ParticipationEvent.objects.get_or_create(
            user=request.user, 
            event=event,
            defaults={
                'nom_complet': f"{request.user.first_name} {request.user.last_name}",
                'email': request.user.email,
                'telephone': getattr(request.user, 'telephone', '')
            }
        )
        if created:
            event.participant_count += 1
            event.save()
            
            # Notification auto
            import uuid
            Notification.objects.create(
                id=str(uuid.uuid4())[:20],
                user=request.user,
                type_notif='inscription_evenement',
                message=f"Votre inscription à l'événement '{event.title}' le {event.date} a été confirmée."
            )
            
            return Response({'status': "inscrit à l'événement", 'participantCount': event.participant_count, 'isRegistered': True})
        return Response({'status': "déjà inscrit", 'participantCount': event.participant_count, 'isRegistered': True})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unregister(self, request, pk=None):
        event = self.get_object()
        participation = ParticipationEvent.objects.filter(user=request.user, event=event)
        if participation.exists():
            participation.delete()
            event.participant_count = max(0, event.participant_count - 1)
            event.save()
            return Response({'status': "désinscrit de l'événement", 'participantCount': event.participant_count, 'isRegistered': False})
        return Response({'status': "pas inscrit", 'participantCount': event.participant_count, 'isRegistered': False})


class NewsViewSet(viewsets.ModelViewSet):
    queryset           = News.objects.all().order_by('-date')
    serializer_class   = NewsSerializer
    permission_classes = [permissions.AllowAny]


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Review.objects.select_related('user', 'livre')
        book_id = self.request.query_params.get('book')
        if book_id:
            qs = qs.filter(livre_id=book_id)
        return qs

    def perform_create(self, serializer):
        data = self.request.data
        # Accepte les alias frontend: bookId, book, livre_id
        livre_id = data.get('bookId') or data.get('book') or data.get('livre_id')
        # Accepte les alias: rating, note
        note = data.get('rating') or data.get('note')
        # Accepte les alias: comment, commentaire
        commentaire = data.get('comment') or data.get('commentaire', '')

        if not livre_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'book': 'Ce champ est requis. Envoyez book, bookId ou livre_id.'})
        if not note:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'note': 'Ce champ est requis. Envoyez note ou rating (1-5).'})

        try:
            note = int(note)
            if not (1 <= note <= 5):
                raise ValueError()
        except (ValueError, TypeError):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'note': 'La note doit être un entier entre 1 et 5.'})

        from .models import Book as BookModel
        try:
            livre = BookModel.objects.get(pk=livre_id)
        except BookModel.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'book': f'Livre avec id={livre_id} introuvable.'})

        existing = Review.objects.filter(user=self.request.user, livre=livre).first()
        if existing:
            existing.note = note
            existing.commentaire = commentaire
            existing.save(update_fields=['note', 'commentaire'])
            serializer.instance = existing
            return

        instance = Review.objects.create(
            user=self.request.user,
            livre=livre,
            note=note,
            commentaire=commentaire
        )
        serializer.instance = instance


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class   = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user).select_related('livre')

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        if self.request.user.type_compte != 'membre':
            raise PermissionDenied("Seuls les membres peuvent faire une demande d'emprunt (réservation).")
            
        livre_id = self.request.data.get('book') or self.request.data.get('livre') or self.request.data.get('bookId')
        from .models import Book as BookModel
        livre = BookModel.objects.get(pk=livre_id)
        instance = Reservation.objects.create(user=self.request.user, livre=livre)
        serializer.instance = instance


class ClubContactMessageViewSet(viewsets.ModelViewSet):
    serializer_class   = ClubContactMessageSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset           = ClubContactMessage.objects.all().order_by('-created_at')


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class   = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user).prefetch_related('messages')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='messages')
    def add_message(self, request, pk=None):
        session = self.get_object()
        content = request.data.get('content', '')
        if not content:
            return Response({'error': 'Contenu requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Sauvegarder le message de l'utilisateur
        user_msg = ChatMessage.objects.create(session=session, role='user', content=content)
        
        # 2. Obtenir la réponse de Kossi
        # On récupère l'historique récent pour le contexte
        recent_msgs = session.messages.order_by('-created_at')[:6]
        history = [m.content for m in reversed(recent_msgs)]
        
        response_data = kossi_instance.get_structured_response(
            content, 
            user_id=request.user.id, 
            history=history
        )
        
        ai_content = response_data.get('message', 'Je ne sais pas quoi répondre.')
        
        # 3. Sauvegarder le message de l'IA
        ai_msg = ChatMessage.objects.create(session=session, role='assistant', content=ai_content)
        
        return Response({
            'user_message': ChatMessageSerializer(user_msg).data,
            'assistant_message': ChatMessageSerializer(ai_msg).data,
            'structured_data': response_data
        }, status=status.HTTP_201_CREATED)

class RecommendationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def list(self, request):
        user_id = request.user.id if request.user.is_authenticated else None
        # On peut passer des paramètres optionnels via query_params
        humeur = request.query_params.get('humeur', 'neutre')
        contrainte = request.query_params.get('contrainte')
        
        # On essaie d'entraîner si ce n'est pas fait (en prod ça devrait être fait périodiquement)
        if not kossi_instance.is_trained:
            kossi_instance.train_recommendation_model()
            
        data = kossi_instance.generate_recommendation(user_id, humeur, contrainte)
        return Response(data)
        
class LabStationViewSet(viewsets.ModelViewSet):
    queryset           = LabStation.objects.all()
    serializer_class   = LabStationSerializer
    permission_classes = [permissions.AllowAny]

class LabReservationViewSet(viewsets.ModelViewSet):
    serializer_class   = LabReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LabReservation.objects.filter(user=self.request.user).select_related('station')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ParticipationEventViewSet(viewsets.ModelViewSet):
    serializer_class   = ParticipationEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ParticipationEvent.objects.filter(user=self.request.user).select_related('event')

    def perform_create(self, serializer):
        event = serializer.validated_data['event']
        # Éviter les doublons
        if ParticipationEvent.objects.filter(user=self.request.user, event=event).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Vous êtes déjà inscrit à cet événement.")
            
        participation = serializer.save(user=self.request.user)
        # Incrémenter le compteur
        event.participant_count += 1
        event.save()
        
        # Notification automatique
        import uuid
        Notification.objects.create(
            id=str(uuid.uuid4())[:20],
            user=self.request.user,
            type_notif='inscription_evenement',
            message=f"Votre inscription à l'événement '{event.title}' a été confirmée. Rendez-vous le {event.date} à {event.time}."
        )
class GlobalStatsView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        from datetime import datetime
        years = datetime.now().year - 1992
        return Response({
            'books_count': Book.objects.count(),
            'members_count': User.objects.count(),
            'events_count': Event.objects.count(),
            'news_count': News.objects.count(),
            'clubs_count': ReadingClub.objects.count(),
            'lab_count': LabStation.objects.count(),
            'years': years,
        })
