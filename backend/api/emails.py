"""
emails.py — Envoi d'emails transactionnels de la bibliothèque CAEB.

Ce module centralise tous les envois d'emails de l'application.
En développement (DEBUG=True), les emails s'affichent dans la console du terminal Django.
En production, ils sont envoyés via le serveur SMTP configuré dans settings.py / .env
"""

import logging
from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

# ── URL de base du frontend ─────────────────────────────────────
FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')


def _envoyer(sujet: str, message_html: str, destinataire: str) -> bool:
    """
    Envoi interne d'un email. Retourne True si envoyé, False sinon.
    message_html : corps de l'email (peut contenir du HTML simple)
    """
    try:
        message_texte = strip_tags(message_html)  # Version texte brut (fallback)
        send_mail(
            subject=sujet,
            message=message_texte,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[destinataire],
            html_message=message_html,
            fail_silently=False,
        )
        logger.info(f"Email envoyé à {destinataire} : {sujet}")
        return True
    except Exception as e:
        logger.error(f"Erreur envoi email à {destinataire} : {e}")
        return False


# ── Email de bienvenue / confirmation d'inscription ─────────────

def envoyer_email_bienvenue(user) -> bool:
    """
    Envoyé immédiatement après l'inscription d'un nouvel utilisateur.
    Contient un lien vers le profil pour compléter les informations.
    """
    sujet = "🎉 Bienvenue à la Bibliothèque CAEB de Natitingou !"
    prenom = getattr(user, 'prenom', '') or user.first_name or user.username

    message_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">

      <div style="background: linear-gradient(135deg, #6C63FF, #4CAF50); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 Bibliothèque CAEB Natitingou</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Bienvenue, {prenom} ! 🎉</h2>

        <p style="color: #4b5563; line-height: 1.6;">
          Votre compte a été créé avec succès. Vous pouvez maintenant accéder à notre
          catalogue de livres, réserver des ouvrages et participer à nos événements culturels.
        </p>

        <div style="background: #f9fafb; border-left: 4px solid #6C63FF; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
          <p style="margin: 0; color: #4b5563; font-size: 14px;">
            <strong>Email :</strong> {user.email}<br>
            <strong>Nom d'utilisateur :</strong> {user.username}
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="{FRONTEND_URL}"
             style="background: linear-gradient(135deg, #6C63FF, #4CAF50); color: white;
                    padding: 14px 32px; border-radius: 8px; text-decoration: none;
                    font-weight: bold; font-size: 16px; display: inline-block;">
            Accéder à la bibliothèque →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Bibliothèque CAEB — Centre d'Animation, d'Éveil et de Bibliothèque de Natitingou<br>
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    </div>
    """

    return _envoyer(sujet, message_html, user.email)


# ── Email de réinitialisation de mot de passe ────────────────────

def envoyer_email_reset_password(user, token: str) -> bool:
    """
    Envoyé quand un utilisateur demande à réinitialiser son mot de passe.
    Le lien est valable 24h.
    """
    sujet = "🔑 Réinitialisation de votre mot de passe — Bibliothèque CAEB"
    prenom = getattr(user, 'prenom', '') or user.first_name or user.username
    lien = f"{FRONTEND_URL}/reset-password?token={token}&email={user.email}"

    message_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">

      <div style="background: linear-gradient(135deg, #6C63FF, #4CAF50); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 Bibliothèque CAEB Natitingou</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour, {prenom}</h2>

        <p style="color: #4b5563; line-height: 1.6;">
          Vous avez demandé la réinitialisation de votre mot de passe.
          Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="{lien}"
             style="background: linear-gradient(135deg, #6C63FF, #4CAF50); color: white;
                    padding: 14px 32px; border-radius: 8px; text-decoration: none;
                    font-weight: bold; font-size: 16px; display: inline-block;">
            Réinitialiser mon mot de passe →
          </a>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            ⚠️ Ce lien expire dans <strong>24 heures</strong>. Si vous n'avez pas
            demandé cette réinitialisation, ignorez cet email.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Bibliothèque CAEB — Natitingou, Bénin<br>
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    </div>
    """

    return _envoyer(sujet, message_html, user.email)


# ── Email de confirmation d'emprunt ──────────────────────────────

def envoyer_email_emprunt(user, livre) -> bool:
    """
    Envoyé quand un utilisateur emprunte un livre.
    """
    sujet = f"📖 Emprunt confirmé : « {livre.titre} »"
    prenom = getattr(user, 'prenom', '') or user.first_name or user.username

    message_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">

      <div style="background: linear-gradient(135deg, #6C63FF, #4CAF50); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 Bibliothèque CAEB Natitingou</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Emprunt confirmé, {prenom} !</h2>

        <p style="color: #4b5563; line-height: 1.6;">
          Votre emprunt a bien été enregistré. Bonne lecture !
        </p>

        <div style="background: #f9fafb; border-left: 4px solid #6C63FF; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
          <p style="margin: 0; color: #4b5563;">
            <strong>📖 Titre :</strong> {livre.titre}<br>
            <strong>✍️ Auteur :</strong> {livre.auteur}
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="{FRONTEND_URL}/catalog"
             style="background: linear-gradient(135deg, #6C63FF, #4CAF50); color: white;
                    padding: 14px 32px; border-radius: 8px; text-decoration: none;
                    font-weight: bold; display: inline-block;">
            Voir mes emprunts →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Bibliothèque CAEB — Natitingou, Bénin
        </p>
      </div>
    </div>
    """

    return _envoyer(sujet, message_html, user.email)
