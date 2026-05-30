from rest_framework import serializers
from .models import (
    User, Book, Borrow, Interaction, Notification,
    ReadingClub, Event, News, Review, Reservation,
    ClubContactMessage, ChatSession, ChatMessage,
    ParticipationEvent
)


class UserSerializer(serializers.ModelSerializer):
    prenom         = serializers.CharField(source='first_name', required=False, allow_blank=True)
    nom            = serializers.CharField(source='last_name', required=False, allow_blank=True)
    # firstName / lastName : alias en lecture seule pour éviter le conflit de source DRF
    firstName      = serializers.CharField(source='first_name', read_only=True)
    lastName       = serializers.CharField(source='last_name', read_only=True)
    isMember       = serializers.SerializerMethodField()
    estMembre      = serializers.SerializerMethodField()
    createdAt      = serializers.DateTimeField(source='date_joined', read_only=True)
    educationLevel = serializers.CharField(source='niveau_etude', required=False, allow_blank=True, allow_null=True)
    preferredGenres = serializers.JSONField(source='genres_preferes', required=False)
    password       = serializers.CharField(write_only=True, required=False)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'password', 'prenom', 'nom', 'firstName', 'lastName', 'email', 'telephone',
            'type_compte', 'date_naissance', 'niveau_etude', 'educationLevel', 'classe',
            'date_inscription', 'createdAt', 'favorites', 'intentions', 'estMembre', 'isMember',
            'preferredGenres', 'sous_genre_prefere', 'pseudo', 'bio', 'avatar', 'demande_adhesion'
        ]
        read_only_fields = ['id', 'date_inscription', 'createdAt']

    def validate_username(self, value):
        """
        Vérifie l'unicité du nom d'utilisateur (insensible à la casse).
        Lors d'une inscription, l'email est utilisé comme username.
        """
        instance = self.instance  # None lors d'une création
        qs = User.objects.filter(username__iexact=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Cette adresse email est déjà associée à un compte existant.")
        return value

    def validate_email(self, value):
        """
        Vérifie l'unicité de l'adresse email lors de l'inscription pour éviter les doublons.
        """
        if value:
            instance = self.instance
            qs = User.objects.filter(email__iexact=value)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Cette adresse email est déjà utilisée par un autre compte.")
        return value

    def get_isMember(self, obj):
        return obj.type_compte == 'membre'
    
    def get_estMembre(self, obj):
        return obj.type_compte == 'membre'

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
    nbAvis      = serializers.IntegerField(source='nb_notes', required=False)
    nbPages     = serializers.IntegerField(source='nb_pages', required=False)
    estNouveau  = serializers.SerializerMethodField()
    estPopulaire = serializers.SerializerMethodField()
    publicCible = serializers.CharField(source='categorie_age', required=False)
    # Aliases En
    cover       = serializers.CharField(source='couverture_url', allow_null=True, required=False)
    synopsis    = serializers.CharField(source='resume', required=False)
    targetAudience = serializers.CharField(source='categorie_age', required=False)

    def get_estNouveau(self, obj):
        return obj.is_new
        
    def get_estPopulaire(self, obj):
        return obj.is_popular

    class Meta:
        model  = Book
        fields = [
            'id', 'titre', 'auteur', 'couverture', 'cover', 'genre', 'sous_genre',
            'annee', 'nbPages', 'langue', 'resume', 'synopsis', 'note', 'nbAvis',
            'exemplaires', 'estNouveau', 'estPopulaire', 'publicCible', 'targetAudience',
            'cote', 'section', 'localisation', 'codes_barres', 'description', 'mots_cles',
            'nb_emprunts', 'popularite', 'nb_emprunteurs_uniq', 'duree_emprunt_moy',
            'score_lecture_moy', 'score_lecture_max', 'popularite_log'
        ]


class BorrowSerializer(serializers.ModelSerializer):
    livre           = BookSerializer(read_only=True)
    utilisateur_id  = serializers.CharField(source='user_id')
    
    # Mappage bidirectionnel entre les anciens noms de champs (exposés à l'API) et les nouveaux noms physiques (en base)
    date_emprunt    = serializers.DateField(source='date_sortie')
    date_prevue     = serializers.DateField(source='date_retour_prevue')
    date_retour     = serializers.DateField(source='date_retour_effective', required=False, allow_null=True)
    prolonge        = serializers.BooleanField(source='renouvele', required=False)
    
    book            = BookSerializer(source='livre', read_only=True)
    borrowDate      = serializers.DateField(source='date_sortie', read_only=True)
    returnDate      = serializers.DateField(source='date_retour_prevue', read_only=True)
    isExtended      = serializers.BooleanField(source='renouvele', read_only=True)
    duree_pret_jours = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Borrow
        fields = [
            'id', 'utilisateur_id', 'livre', 'book', 'date_sortie', 'date_emprunt', 'borrowDate', 
            'date_retour_prevue', 'date_prevue', 'returnDate', 'date_retour_effective', 'date_retour', 
            'renouvele', 'isExtended', 'prolonge', 'statut', 'duree_pret_jours'
        ]


class LivreMiniSerializer(serializers.ModelSerializer):
    """Sérialisation légère du livre pour l'embedding dans une interaction."""
    couverture = serializers.CharField(source='couverture_url', allow_null=True)

    class Meta:
        model  = Book
        fields = ['id', 'titre', 'auteur', 'couverture', 'genre']


class InteractionSerializer(serializers.ModelSerializer):
    livre_detail = LivreMiniSerializer(source='livre', read_only=True)
    # Alias écriture : le frontend envoie { livre: "<book_id>" }
    livre = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(),
        write_only=True,
        source='livre'
    )

    class Meta:
        model  = Interaction
        fields = [
            'id', 'user', 'livre', 'livre_detail', 'type_action',
            'notation', 'duree_secondes', 'livre_lu', 'commentaire',
            'position', 'source', 'created_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'livre_detail']


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
    nom          = serializers.CharField(source='name')
    name         = serializers.CharField()
    publicCible  = serializers.CharField(source='target_audience')
    targetAudience = serializers.CharField(source='target_audience')
    nbMembres    = serializers.IntegerField(source='member_count')
    memberCount  = serializers.IntegerField(source='member_count')
    responsable  = serializers.SerializerMethodField()
    manager      = serializers.SerializerMethodField()

    estMembre    = serializers.SerializerMethodField()
    isJoined     = serializers.SerializerMethodField()

    class Meta:
        model  = ReadingClub
        fields = [
            'id', 'nom', 'name', 'description', 'image', 'publicCible', 'targetAudience', 
            'nbMembres', 'memberCount', 'responsable', 'manager', 'estMembre', 'isJoined'
        ]

    def get_estMembre(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.members.filter(pk=request.user.pk).exists()

    def get_isJoined(self, obj):
        return self.get_estMembre(obj)

    def get_responsable(self, obj):
        return {'nom': obj.manager_name, 'role': obj.manager_role, 'email': obj.manager_email}
    
    def get_manager(self, obj):
        return {'name': obj.manager_name, 'role': obj.manager_role, 'email': obj.manager_email}


class EventSerializer(serializers.ModelSerializer):
    titre           = serializers.CharField(source='title')
    title           = serializers.CharField()
    heure           = serializers.CharField(source='time')
    time            = serializers.CharField()
    type            = serializers.CharField(source='type_event')
    nbParticipants  = serializers.IntegerField(source='participant_count')
    participantCount = serializers.IntegerField(source='participant_count')
    club_id         = serializers.CharField(required=False, allow_null=True)
    clubId          = serializers.CharField(source='club_id', required=False, allow_null=True)

    estInscrit      = serializers.SerializerMethodField()
    isRegistered    = serializers.SerializerMethodField()

    class Meta:
        model  = Event
        fields = [
            'id', 'titre', 'title', 'description', 'type', 'date', 'heure', 'time', 
            'location', 'nbParticipants', 'participantCount', 'club_id', 'clubId',
            'estInscrit', 'isRegistered'
        ]

    def get_estInscrit(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.participants.filter(user=request.user).exists()

    def get_isRegistered(self, obj):
        return self.get_estInscrit(obj)


class NewsSerializer(serializers.ModelSerializer):
    titre       = serializers.CharField(source='title')
    title       = serializers.CharField()
    resume      = serializers.CharField(source='excerpt')
    excerpt     = serializers.CharField()
    contenu     = serializers.CharField(source='content')
    content     = serializers.CharField()
    categorie   = serializers.CharField(source='category')
    category    = serializers.CharField()
    misEnAvant  = serializers.BooleanField(source='featured')
    featured    = serializers.BooleanField()

    class Meta:
        model  = News
        fields = [
            'id', 'titre', 'title', 'resume', 'excerpt', 'contenu', 'content', 
            'image', 'date', 'categorie', 'category', 'misEnAvant', 'featured'
        ]


class ReviewSerializer(serializers.ModelSerializer):
    # Champs lecture (réponse API)
    utilisateur_id   = serializers.CharField(source='user_id', read_only=True)
    nom_utilisateur  = serializers.CharField(source='user.username', read_only=True)
    prenom_utilisateur = serializers.CharField(source='user.first_name', read_only=True)
    date_creation    = serializers.DateTimeField(source='created_at', read_only=True)

    # Champs écriture — accepte alias frontend ET noms Django
    livre_id         = serializers.CharField(required=False, write_only=True)
    book             = serializers.CharField(required=False, write_only=True)   # alias frontend
    bookId           = serializers.CharField(required=False, write_only=True)   # alias frontend
    rating           = serializers.IntegerField(required=False, write_only=True, min_value=1, max_value=5)
    comment          = serializers.CharField(required=False, write_only=True, allow_blank=True)

    class Meta:
        model  = Review
        fields = [
            'id', 'utilisateur_id', 'livre_id', 'nom_utilisateur', 'prenom_utilisateur',
            'note', 'commentaire', 'date_creation',
            # write-only aliases
            'book', 'bookId', 'rating', 'comment',
        ]
        read_only_fields = ['id', 'utilisateur_id', 'nom_utilisateur', 'prenom_utilisateur', 'date_creation']


class ReservationSerializer(serializers.ModelSerializer):
    livre            = BookSerializer(read_only=True)
    livre_id         = serializers.CharField(required=False)
    utilisateur_id   = serializers.CharField(source='user_id', read_only=True)
    date_reservation = serializers.DateTimeField(read_only=True)
    book            = BookSerializer(source='livre', read_only=True)
    status          = serializers.CharField(source='statut')
    reservedAt      = serializers.DateTimeField(source='date_reservation', read_only=True)

    class Meta:
        model  = Reservation
        fields = ['id', 'utilisateur_id', 'livre', 'book', 'livre_id', 'date_reservation', 'reservedAt', 'statut', 'status']


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


class ParticipationEventSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model  = ParticipationEvent
        fields = ['id', 'user', 'event', 'event_title', 'date_inscription', 'nom_complet', 'email', 'telephone', 'motivations']
        read_only_fields = ['id', 'user', 'date_inscription']
