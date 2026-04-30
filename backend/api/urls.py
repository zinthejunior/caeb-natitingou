from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users',         views.UserViewSet)
router.register(r'books',         views.BookViewSet)
router.register(r'borrows',       views.BorrowViewSet,              basename='borrow')
router.register(r'interactions',  views.InteractionViewSet,         basename='interaction')
router.register(r'notifications', views.NotificationViewSet,        basename='notification')
router.register(r'clubs',         views.ReadingClubViewSet)
router.register(r'events',        views.EventViewSet)
router.register(r'news',          views.NewsViewSet)
router.register(r'reviews',       views.ReviewViewSet,              basename='review')
router.register(r'reservations',  views.ReservationViewSet,         basename='reservation')
router.register(r'contacts',      views.ClubContactMessageViewSet,  basename='contact')
router.register(r'chat',          views.ChatSessionViewSet,         basename='chat')

urlpatterns = [
    path('', include(router.urls)),
]
