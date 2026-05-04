from rest_framework import serializers
from .models import (
    User, Book, Borrow, Interaction, Notification,
    ReadingClub, Event, News, Review, Reservation,
    ClubContactMessage, ChatSession, ChatMessage
)


class UserSerializer(serializers.ModelSerializer):
    prenom = serializers.CharField(source='first_name')
    nom    = serializers.CharField(source='last_name')
    password  = serializers.CharField(write_only=True, required=False)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'password', 'prenom', 'nom', 'email',
            'type_compte', 'date_naissance', 'niveau_etude', 'classe',
            'date_inscription', 'favorites', 'intentions',
        ]
        read_only_fields = ['id', 'date_inscription']

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
    couverture  = serializers.CharField(source='couverture_url', allow_null=True, required=False)
    note        = serializers.FloatField(source='note_moyenne', required=False)
    nb_avis     = serializers.IntegerField(source='nb_notes', required=False)
    nouveau     = serializers.SerializerMethodField()
    populaire   = serializers.SerializerMethodField()
    public_cible = serializers.CharField(source='categorie_age', required=False)

    def get_nouveau(self, obj):
        return getattr(obj, 'is_new', False)
        
    def get_populaire(self, obj):
        return getattr(obj, 'is_popular', False)

    class Meta:
        model  = Book
        fields = [
            'id', 'titre', 'auteur', 'couverture', 'genre', 'sous_genre',
            'annee', 'nb_pages', 'langue', 'resume', 'note', 'nb_avis',
            'disponible', 'nouveau', 'populaire', 'public_cible',
        ]


class BorrowSerializer(serializers.ModelSerializer):
    livre           = BookSerializer(source='livre', read_only=True)
    utilisateur_id  = serializers.CharField(source='user_id')
    date_emprunt    = serializers.DateField(source='date_emprunt')
    date_prevue     = serializers.DateField(source='date_prevue')
    date_retour     = serializers.DateField(source='date_retour', required=False, allow_null=True)
    prolonge        = serializers.BooleanField(source='renouvele', required=False)

    class Meta:
        model  = Borrow
        fields = ['id', 'utilisateur_id', 'livre', 'date_emprunt', 'date_prevue', 'date_retour', 'renouvele', 'prolonge', 'statut']


class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Interaction
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    utilisateur_id = serializers.CharField(source='user_id')
    livre_id       = serializers.CharField(source='livre_id', required=False, allow_null=True)
    date_creation  = serializers.DateTimeField(source='envoyee_le')
    type           = serializers.CharField(source='type_notif')
    lu             = serializers.BooleanField(source='lue')

    class Meta:
        model  = Notification
        fields = ['id', 'utilisateur_id', 'livre_id', 'type', 'message', 'lu', 'date_creation']


class ReadingClubSerializer(serializers.ModelSerializer):
    public_cible = serializers.CharField(source='target_audience')
    nb_membres   = serializers.IntegerField(source='member_count')
    responsable  = serializers.SerializerMethodField()

    class Meta:
        model  = ReadingClub
        fields = ['id', 'name', 'description', 'image', 'public_cible', 'nb_membres', 'responsable']

    def get_responsable(self, obj):
        return {'nom': obj.manager_name, 'role': obj.manager_role, 'email': obj.manager_email}


class EventSerializer(serializers.ModelSerializer):
    type            = serializers.CharField(source='type_event')
    nb_participants = serializers.IntegerField(source='participant_count')
    club_id         = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model  = Event
        fields = ['id', 'title', 'description', 'type', 'date', 'time', 'location', 'nb_participants', 'club_id']


class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model  = News
        fields = '__all__'


class ReviewSerializer(serializers.ModelSerializer):
    livre_id         = serializers.CharField(required=False)
    utilisateur_id   = serializers.CharField(source='user_id', read_only=True)
    nom_utilisateur  = serializers.CharField(source='user.username', read_only=True)
    date_creation    = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model  = Review
        fields = ['id', 'utilisateur_id', 'livre_id', 'nom_utilisateur', 'note', 'commentaire', 'date_creation']


class ReservationSerializer(serializers.ModelSerializer):
    livre            = BookSerializer(source='livre', read_only=True)
    livre_id         = serializers.CharField(required=False)
    utilisateur_id   = serializers.CharField(source='user_id', read_only=True)
    date_reservation = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = Reservation
        fields = ['id', 'utilisateur_id', 'livre', 'livre_id', 'date_reservation', 'statut']


class ClubContactMessageSerializer(serializers.ModelSerializer):
    club_id = serializers.CharField(source='club_id')

    class Meta:
        model  = ClubContactMessage
        fields = ['id', 'club_id', 'nom', 'email', 'message', 'created_at']
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
