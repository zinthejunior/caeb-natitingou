from rest_framework import viewsets, permissions
from .models import User, Book, Borrow, Interaction, Notification, ReadingClub, Event, News, Review, Reservation
from .serializers import (
    UserSerializer, BookSerializer, BorrowSerializer, InteractionSerializer,
    NotificationSerializer, ReadingClubSerializer, EventSerializer,
    NewsSerializer, ReviewSerializer, ReservationSerializer
)
from rest_framework.response import Response
from rest_framework.decorators import action


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        # Logique favoris gérée côté frontend via updateUser
        return Response({'status': 'favoris mis à jour'})


class BorrowViewSet(viewsets.ModelViewSet):
    queryset = Borrow.objects.all()
    serializer_class = BorrowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Borrow.objects.filter(user=self.request.user)


class InteractionViewSet(viewsets.ModelViewSet):
    queryset = Interaction.objects.all()
    serializer_class = InteractionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Interaction.objects.filter(user=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class ReadingClubViewSet(viewsets.ModelViewSet):
    queryset = ReadingClub.objects.all()
    serializer_class = ReadingClubSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        club = self.get_object()
        club.member_count += 1
        club.save()
        return Response({'status': 'inscrit au club'})


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'])
    def register(self, request, pk=None):
        event = self.get_object()
        event.participant_count += 1
        event.save()
        return Response({'status': "inscrit à l'événement"})


class NewsViewSet(viewsets.ModelViewSet):
    queryset = News.objects.all()
    serializer_class = NewsSerializer
    permission_classes = [permissions.AllowAny]


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
