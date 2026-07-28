#!/bin/bash

echo "🧪 Test de Connectivité CAEB"
echo "=============================="
echo ""

# Test des URLs
echo "1️⃣ Test des URLs Deployées"
echo "---"

urls=(
  "https://admin-nextjs-lemon.vercel.app"
  "https://kossi-chat.vercel.app"
  "https://caeb-frontend.vercel.app"
  "https://caeb-backend.onrender.com"
  "https://kossi-backend.onrender.com"
)

for url in "${urls[@]}"; do
  echo -n "Testing $url ... "
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" = "200" ] || [ "$status" = "302" ]; then
    echo "✅ OK ($status)"
  else
    echo "❌ FAILED ($status)"
  fi
done

echo ""
echo "2️⃣ Test des APIs"
echo "---"

# Test Backend Django
echo -n "Django API (/api/stats) ... "
status=$(curl -s -o /dev/null -w "%{http_code}" "https://caeb-backend.onrender.com/api/stats/")
if [ "$status" = "200" ]; then
  echo "✅ OK"
elif [ "$status" = "401" ] || [ "$status" = "403" ]; then
  echo "⚠️  Auth Required (Expected)"
else
  echo "❌ FAILED ($status)"
fi

# Test Backend FastAPI
echo -n "FastAPI Health Check ... "
status=$(curl -s -o /dev/null -w "%{http_code}" "https://kossi-backend.onrender.com/health")
if [ "$status" = "200" ] || [ "$status" = "404" ]; then
  echo "✅ OK (Server Alive)"
else
  echo "❌ FAILED ($status)"
fi

echo ""
echo "3️⃣ Test CORS (Admin → Django)"
echo "---"
response=$(curl -s -H "Origin: https://admin-nextjs-lemon.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type" \
  -X OPTIONS "https://caeb-backend.onrender.com/api/books/")

if echo "$response" | grep -q "Access-Control-Allow"; then
  echo "✅ CORS Configured"
else
  echo "⚠️  CORS May Need Configuration"
fi

echo ""
echo "✅ Test Completed!"
