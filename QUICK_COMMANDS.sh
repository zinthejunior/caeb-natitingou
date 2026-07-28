#!/bin/bash

# CAEB Natitingou - Quick Commands
# ================================

echo "🚀 CAEB Natitingou - Quick Commands"
echo "===================================="
echo ""
echo "Déploiements:"
echo "  1. Admin Panel: https://admin-nextjs-lemon.vercel.app"
echo "  2. Kossi Chat: https://kossi-chat.vercel.app"
echo "  3. caeb-frontend: https://caeb-frontend.vercel.app"
echo ""
echo "Repos GitHub:"
echo "  - https://github.com/zinthejunior/caeb-admin"
echo "  - https://github.com/zinthejunior/kossi-chat"
echo ""
echo "Commandes Utiles:"
echo ""

# Fonction pour tester les URLs
test_urls() {
    echo "Testing deployed apps..."
    echo -n "Admin: " && curl -s -o /dev/null -w "%{http_code}\n" https://admin-nextjs-lemon.vercel.app
    echo -n "Kossi: " && curl -s -o /dev/null -w "%{http_code}\n" https://kossi-chat.vercel.app
    echo -n "Frontend: " && curl -s -o /dev/null -w "%{http_code}\n" https://caeb-frontend.vercel.app
}

# Fonction pour voir les logs Vercel
view_logs() {
    echo "View Vercel Logs:"
    echo "  vercel logs https://admin-nextjs-lemon.vercel.app --follow"
    echo "  vercel logs https://kossi-chat.vercel.app --follow"
}

# Fonction pour configurer les env vars
setup_env() {
    echo "Setup Environment Variables:"
    echo ""
    echo "Admin Panel:"
    echo "  vercel link caeb-admin"
    echo "  vercel env add NEXT_PUBLIC_SUPABASE_URL"
    echo "  vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  vercel env add NEXT_PUBLIC_API_URL"
    echo ""
    echo "Kossi Chat:"
    echo "  vercel link kossi-chat"
    echo "  vercel env add NEXT_PUBLIC_KOSSI_API"
    echo "  vercel env add NEXT_PUBLIC_CAEB_API"
}

# Fonction pour redéployer
redeploy() {
    echo "Redeploy:"
    echo "  Admin: cd admin-nextjs && git push && vercel --prod"
    echo "  Kossi: cd Kossi && git push && vercel --prod"
}

# Menu
case "$1" in
    "test")
        test_urls
        ;;
    "logs")
        view_logs
        ;;
    "env")
        setup_env
        ;;
    "redeploy")
        redeploy
        ;;
    *)
        echo "Usage: $0 {test|logs|env|redeploy}"
        echo ""
        test_urls
        ;;
esac
