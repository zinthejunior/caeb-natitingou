from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'books', views.BookViewSet)
router.register(r'borrows', views.BorrowViewSet)
router.register(r'interactions', views.InteractionViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'clubs', views.ReadingClubViewSet)
router.register(r'events', views.EventViewSet)
router.register(r'news', views.NewsViewSet)
router.register(r'reviews', views.ReviewViewSet)
router.register(r'reservations', views.ReservationViewSet)


urlpatterns = [
    path('', include(router.urls)),
]
