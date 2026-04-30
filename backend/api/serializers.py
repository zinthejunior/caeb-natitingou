from rest_framework import serializers
from .models import User, Book, Borrow, Interaction, Notification, ReadingClub, Event, News, Badge, Review, Reservation

class UserSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    class Meta:
        model = User
        fields = [
            'id', 'username', 'firstName', 'lastName', 'email', 
            'type_compte', 'date_naissance', 'niveau_etude', 'classe', 
            'genre_prefere', 'sous_genre_prefere', 'score_confiance', 
            'profil_complet', 'date_inscription', 'xp', 'level'
        ]

class BookSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='titre')
    author = serializers.CharField(source='auteur')
    cover = serializers.CharField(source='couverture_url', required=False, allow_null=True)
    year = serializers.IntegerField(source='annee', required=False, allow_null=True)
    pages = serializers.IntegerField(source='nb_pages', required=False, allow_null=True)
    synopsis = serializers.CharField(source='resume', required=False, allow_null=True)
    rating = serializers.FloatField(source='note_moyenne', required=False)
    reviewCount = serializers.IntegerField(source='nb_notes', required=False)
    isAvailable = serializers.BooleanField(source='disponible', required=False)
    targetAudience = serializers.CharField(source='categorie_age', required=False)
    
    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'cover', 'genre', 'sous_genre', 
            'year', 'pages', 'langue', 'synopsis', 'rating', 'reviewCount', 
            'isAvailable', 'targetAudience', 'mots_cles', 'vecteur_livre', 
            'nb_emprunts', 'popularite'
        ]

class BorrowSerializer(serializers.ModelSerializer):
    book = BookSerializer(source='livre', read_only=True)
    userId = serializers.CharField(source='user_id')
    borrowDate = serializers.DateField(source='date_emprunt')
    returnDate = serializers.DateField(source='date_prevue')
    returnedAt = serializers.DateField(source='date_retour', required=False, allow_null=True)
    
    class Meta:
        model = Borrow
        fields = [
            'id', 'userId', 'book', 'borrowDate', 'returnDate', 
            'returnedAt', 'renouvele', 'statut', 'poids'
        ]

class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interaction
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source='user_id')
    livreId = serializers.CharField(source='livre_id', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='envoyee_le')
    type = serializers.CharField(source='type_notif')
    
    class Meta:
        model = Notification
        fields = [
            'id', 'userId', 'livreId', 'type', 'message', 'lu', 'createdAt'
        ]

class ReadingClubSerializer(serializers.ModelSerializer):
    targetAudience = serializers.CharField(source='target_audience')
    memberCount = serializers.IntegerField(source='member_count')
    manager = serializers.SerializerMethodField()
    
    class Meta:
        model = ReadingClub
        fields = [
            'id', 'name', 'description', 'image', 'targetAudience', 
            'memberCount', 'manager'
        ]
        
    def get_manager(self, obj):
        return {
            'name': obj.manager_name,
            'role': obj.manager_role,
            'email': obj.manager_email
        }

class EventSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='type_event')
    participantCount = serializers.IntegerField(source='participant_count')
    clubId = serializers.CharField(source='club_id', required=False, allow_null=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'type', 'date', 'time', 
            'location', 'participantCount', 'clubId'
        ]

class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = '__all__'

class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = '__all__'

class ReviewSerializer(serializers.ModelSerializer):
    userName = serializers.CharField(source='user.username', read_only=True)
    bookTitle = serializers.CharField(source='livre.titre', read_only=True)
    class Meta:
        model = Review
        fields = ['id', 'user', 'userName', 'livre', 'bookTitle', 'note', 'commentaire', 'created_at']

class ReservationSerializer(serializers.ModelSerializer):
    book = BookSerializer(source='livre', read_only=True)
    class Meta:
        model = Reservation
        fields = ['id', 'user', 'book', 'date_reservation', 'statut']
