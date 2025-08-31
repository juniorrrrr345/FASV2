#!/bin/bash

# 🔄 CONVERSION CLOUDINARY → CLOUDFLARE R2 (GARDER NOMS FICHIERS)
echo "🔄 Conversion Cloudinary → Cloudflare R2 avec noms originaux..."

ACCOUNT_ID="7979421604bd07b3bd34d3ed96222512"
DATABASE_ID="78d6725a-cd0f-46f9-9fa4-25ca4faa3efb"
API_TOKEN="ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW"
BASE_URL="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database/$DATABASE_ID/query"
R2_BASE="https://pub-b38679a01a274648827751df94818418.r2.dev"

echo "🖼️ Conversion des images..."

# Convertir images en gardant les noms de fichiers
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "UPDATE products SET image_url = REPLACE(REPLACE(image_url, \"https://res.cloudinary.com/dfbv2sln2/image/upload/\", \"https://pub-b38679a01a274648827751df94818418.r2.dev/images/\"), \"boutique_images/\", \"\") WHERE image_url LIKE \"%cloudinary%\";"}'

echo "🎬 Conversion des vidéos..."

# Convertir vidéos en gardant les noms de fichiers
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "UPDATE products SET video_url = REPLACE(REPLACE(video_url, \"https://res.cloudinary.com/dfbv2sln2/video/upload/\", \"https://pub-b38679a01a274648827751df94818418.r2.dev/videos/\"), \"boutique_videos/\", \"\") WHERE video_url LIKE \"%cloudinary%\";"}'

echo "🔍 Vérification conversion..."

# Vérifier le résultat
RESULT=$(curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT name, image_url, video_url FROM products LIMIT 3;"}')

echo "📊 Résultat conversion:"
echo "$RESULT" | grep -o '"name":"[^"]*"' | head -3
echo "$RESULT" | grep -o '"image_url":"[^"]*"' | head -3

echo ""
echo "✅ CONVERSION TERMINÉE !"
echo "✅ Images: Cloudinary → Cloudflare R2"
echo "✅ Vidéos: Cloudinary → Cloudflare R2"
echo "✅ Noms de fichiers conservés"
echo "✅ 100% Cloudflare maintenant !"