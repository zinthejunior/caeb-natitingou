from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
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
router.register(r'lab-stations',     views.LabStationViewSet)
router.register(r'lab-reservations', views.LabReservationViewSet,       basename='lab-reservation')
router.register(r'participations-evenements', views.ParticipationEventViewSet, basename='participation-event')

urlpatterns = [
    path('stats/', views.GlobalStatsView.as_view(), name='global-stats'),
    path('', include(router.urls)),
]
