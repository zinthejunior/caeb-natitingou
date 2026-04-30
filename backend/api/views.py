from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import (
    User, Book, Borrow, Interaction, Notification,
    ReadingClub, Event, News, Review, Reservation,
    ClubContactMessage, ChatSession, ChatMessage
)
from .serializers import (
    UserSerializer, UserPasswordSerializer, BookSerializer, BorrowSerializer,
    InteractionSerializer, NotificationSerializer, ReadingClubSerializer,
    EventSerializer, NewsSerializer, ReviewSerializer, ReservationSerializer,
    ClubContactMessageSerializer, ChatSessionSerializer, ChatMessageSerializer
)


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
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

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

    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        # Géré côté frontend via PATCH /api/users/me/update/
        return Response({'status': 'ok'})


class BorrowViewSet(viewsets.ModelViewSet):
    serializer_class   = BorrowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Borrow.objects.filter(user=self.request.user).select_related('livre')


class InteractionViewSet(viewsets.ModelViewSet):
    serializer_class   = InteractionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Interaction.objects.filter(user=self.request.user)

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
        club.member_count += 1
        club.save()
        # Ajouter l'ID du club aux clubs suivis de l'utilisateur
        user = request.user
        followed = user.favorites or []  # On réutilise le même pattern
        return Response({'status': 'inscrit au club', 'memberCount': club.member_count})

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
        event.participant_count += 1
        event.save()
        return Response({'status': "inscrit à l'événement", 'participantCount': event.participant_count})


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
        livre_id = self.request.data.get('bookId') or self.request.data.get('book')
        note     = self.request.data.get('rating') or self.request.data.get('note')
        comment  = self.request.data.get('comment') or self.request.data.get('commentaire', '')
        from .models import Book as BookModel
        livre = BookModel.objects.get(pk=livre_id)
        Review.objects.create(user=self.request.user, livre=livre, note=note, commentaire=comment)


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class   = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user).select_related('livre')

    def perform_create(self, serializer):
        livre_id = self.request.data.get('book') or self.request.data.get('livre') or self.request.data.get('bookId')
        from .models import Book as BookModel
        livre = BookModel.objects.get(pk=livre_id)
        Reservation.objects.create(user=self.request.user, livre=livre)


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
        role    = request.data.get('role', 'user')
        content = request.data.get('content', '')
        if not content:
            return Response({'error': 'Contenu requis'}, status=status.HTTP_400_BAD_REQUEST)
        msg = ChatMessage.objects.create(session=session, role=role, content=content)
        return Response(ChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)
