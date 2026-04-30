from rest_framework import serializers
from .models import (
    User, Book, Borrow, Interaction, Notification,
    ReadingClub, Event, News, Review, Reservation,
    ClubContactMessage, ChatSession, ChatMessage
)


class UserSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name')
    lastName  = serializers.CharField(source='last_name')
    password  = serializers.CharField(write_only=True, required=False)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'password', 'firstName', 'lastName', 'email',
            'type_compte', 'date_naissance', 'niveau_etude', 'classe',
            'genre_prefere', 'sous_genre_prefere', 'score_confiance',
            'profil_complet', 'date_inscription', 'favorites', 'intentions',
        ]
        read_only_fields = ['id', 'date_inscription', 'score_confiance']

    def create(self, validated_data):
        import uuid
        password = validated_data.pop('password', None)
        validated_data.setdefault('id', str(uuid.uuid4())[:40])
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserPasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Ancien mot de passe incorrect.")
        return value


class BookSerializer(serializers.ModelSerializer):
    title       = serializers.CharField(source='titre')
    author      = serializers.CharField(source='auteur', allow_null=True, required=False)
    cover       = serializers.CharField(source='couverture_url', allow_null=True, required=False)
    year        = serializers.IntegerField(source='annee', allow_null=True, required=False)
    pages       = serializers.IntegerField(source='nb_pages', allow_null=True, required=False)
    synopsis    = serializers.CharField(source='resume', allow_null=True, required=False)
    rating      = serializers.FloatField(source='note_moyenne', required=False)
    reviewCount = serializers.IntegerField(source='nb_notes', required=False)
    isAvailable = serializers.BooleanField(source='disponible', required=False)
    isNew       = serializers.BooleanField(source='is_new', required=False, default=False)
    isPopular   = serializers.BooleanField(source='is_popular', required=False, default=False)
    targetAudience = serializers.CharField(source='categorie_age', required=False)

    class Meta:
        model  = Book
        fields = [
            'id', 'title', 'author', 'cover', 'genre', 'sous_genre',
            'year', 'pages', 'langue', 'synopsis', 'rating', 'reviewCount',
            'isAvailable', 'isNew', 'isPopular', 'targetAudience',
            'mots_cles', 'nb_emprunts', 'popularite',
        ]


class BorrowSerializer(serializers.ModelSerializer):
    book       = BookSerializer(source='livre', read_only=True)
    userId     = serializers.CharField(source='user_id')
    borrowDate = serializers.DateField(source='date_emprunt')
    returnDate = serializers.DateField(source='date_prevue')
    returnedAt = serializers.DateField(source='date_retour', required=False, allow_null=True)
    isExtended = serializers.BooleanField(source='renouvele', required=False)

    class Meta:
        model  = Borrow
        fields = ['id', 'userId', 'book', 'borrowDate', 'returnDate', 'returnedAt', 'renouvele', 'isExtended', 'statut', 'poids']


class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Interaction
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    userId    = serializers.CharField(source='user_id')
    livreId   = serializers.CharField(source='livre_id', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='envoyee_le')
    type      = serializers.CharField(source='type_notif')
    lu        = serializers.BooleanField(source='lue')

    class Meta:
        model  = Notification
        fields = ['id', 'userId', 'livreId', 'type', 'message', 'lu', 'createdAt']


class ReadingClubSerializer(serializers.ModelSerializer):
    targetAudience = serializers.CharField(source='target_audience')
    memberCount    = serializers.IntegerField(source='member_count')
    manager        = serializers.SerializerMethodField()

    class Meta:
        model  = ReadingClub
        fields = ['id', 'name', 'description', 'image', 'targetAudience', 'memberCount', 'manager']

    def get_manager(self, obj):
        return {'name': obj.manager_name, 'role': obj.manager_role, 'email': obj.manager_email}


class EventSerializer(serializers.ModelSerializer):
    type             = serializers.CharField(source='type_event')
    participantCount = serializers.IntegerField(source='participant_count')
    clubId           = serializers.CharField(source='club_id', required=False, allow_null=True)

    class Meta:
        model  = Event
        fields = ['id', 'title', 'description', 'type', 'date', 'time', 'location', 'participantCount', 'clubId']


class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model  = News
        fields = '__all__'


class ReviewSerializer(serializers.ModelSerializer):
    # Expose camelCase for frontend, map to Django model fields
    rating    = serializers.IntegerField(source='note')
    comment   = serializers.CharField(source='commentaire')
    bookId    = serializers.CharField(source='livre_id', required=False)
    userId    = serializers.CharField(source='user_id', read_only=True)
    userName  = serializers.CharField(source='user.username', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model  = Review
        fields = ['id', 'userId', 'bookId', 'userName', 'rating', 'comment', 'createdAt']


class ReservationSerializer(serializers.ModelSerializer):
    book       = BookSerializer(source='livre', read_only=True)
    bookId     = serializers.CharField(source='livre_id', required=False)
    userId     = serializers.CharField(source='user_id', read_only=True)
    reservedAt = serializers.DateTimeField(source='date_reservation', read_only=True)
    status     = serializers.CharField(source='statut', required=False)

    class Meta:
        model  = Reservation
        fields = ['id', 'userId', 'book', 'bookId', 'reservedAt', 'status']


class ClubContactMessageSerializer(serializers.ModelSerializer):
    clubId = serializers.CharField(source='club_id')

    class Meta:
        model  = ClubContactMessage
        fields = ['id', 'clubId', 'nom', 'email', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ChatMessage
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model  = ChatSession
        fields = ['id', 'titre', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['id', 'created_at', 'updated_at']
