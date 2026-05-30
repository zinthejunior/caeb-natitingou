from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DefaultRouter est un outil de Django REST Framework qui crée automatiquement
# les URL pour les ViewSets.
# Un ViewSet est une classe qui décrit comment afficher, créer, modifier ou
# supprimer des données.
#
# Par exemple, si on enregistre `router.register(r'livres', views.BookViewSet)`,
# on obtient automatiquement :
#   - GET /livres/         pour lister les livres
#   - POST /livres/        pour créer un nouveau livre
#   - GET /livres/<id>/    pour voir un livre précis
#   - PUT /livres/<id>/    pour remplacer un livre existant
#   - PATCH /livres/<id>/  pour modifier partiellement un livre
#   - DELETE /livres/<id>/ pour supprimer un livre
router = DefaultRouter()

# Chaque ligne ci-dessous crée un point d'accès API pour un type de données.
# Le premier paramètre est le préfixe d'URL, le second est la vue qui gère ce type.
router.register(r'utilisateurs',   views.UserViewSet)
router.register(r'livres',         views.BookViewSet)
router.register(r'emprunts',       views.BorrowViewSet,              basename='borrow')
router.register(r'interactions',   views.InteractionViewSet,         basename='interaction')
router.register(r'notifications',  views.NotificationViewSet,        basename='notification')
router.register(r'clubs',          views.ReadingClubViewSet)
router.register(r'evenements',     views.EventViewSet)
router.register(r'actualites',     views.NewsViewSet)
router.register(r'avis',           views.ReviewViewSet,              basename='review')
router.register(r'reservations',   views.ReservationViewSet,         basename='reservation')
router.register(r'contacts',       views.ClubContactMessageViewSet,  basename='contact')
router.register(r'chat',           views.ChatSessionViewSet,         basename='chat')
router.register(r'recommandations', views.RecommendationViewSet,       basename='recommendation')
router.register(r'participations-evenements', views.ParticipationEventViewSet, basename='participation-event')

urlpatterns = [
    # Cette route est un endpoint spécial pour récupérer des statistiques globales.
    path('stats/', views.GlobalStatsView.as_view(), name='global-stats'),
    # Inclut toutes les URL générées par le router ci-dessus.
    path('', include(router.urls)),
]
 
