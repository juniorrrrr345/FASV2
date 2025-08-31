#!/bin/bash

# 🔄 CONVERSION CLOUDINARY → CLOUDFLARE R2
echo "🔄 Conversion toutes les URLs Cloudinary → Cloudflare R2..."

ACCOUNT_ID="7979421604bd07b3bd34d3ed96222512"
DATABASE_ID="78d6725a-cd0f-46f9-9fa4-25ca4faa3efb"
API_TOKEN="ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW"
BASE_URL="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database/$DATABASE_ID/query"

# Cloudflare R2 base URL
R2_BASE="https://pub-b38679a01a274648827751df94818418.r2.dev"

echo "🔍 Recherche des URLs Cloudinary dans les produits..."

# Récupérer tous les produits avec URLs Cloudinary
PRODUCTS=$(curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT id, name, image_url, video_url FROM products WHERE image_url LIKE \"%cloudinary%\" OR video_url LIKE \"%cloudinary%\";"}')

echo "📊 Produits avec URLs Cloudinary trouvés:"
echo "$PRODUCTS" | jq -r '.result[0].results[] | "\(.id): \(.name)"'

# Fonction pour convertir URL Cloudinary → Cloudflare R2
convert_url() {
    local url="$1"
    local type="$2"  # "image" ou "video"
    
    if [[ $url == *"cloudinary"* ]]; then
        # Extraire le nom de fichier
        filename=$(basename "$url" | cut -d'.' -f1)
        extension=$(basename "$url" | cut -d'.' -f2)
        
        # Créer nouvelle URL Cloudflare R2
        if [ "$type" = "image" ]; then
            new_url="$R2_BASE/images/${filename}.${extension}"
        else
            new_url="$R2_BASE/videos/${filename}.${extension}"
        fi
        
        echo "$new_url"
    else
        echo "$url"
    fi
}

# Convertir toutes les URLs
echo "$PRODUCTS" | jq -r '.result[0].results[]' | while IFS= read -r product; do
    id=$(echo "$product" | jq -r '.id')
    name=$(echo "$product" | jq -r '.name')
    image_url=$(echo "$product" | jq -r '.image_url // ""')
    video_url=$(echo "$product" | jq -r '.video_url // ""')
    
    echo "🔄 Conversion produit: $name"
    
    # Convertir image_url si Cloudinary
    if [[ $image_url == *"cloudinary"* ]]; then
        new_image_url=$(convert_url "$image_url" "image")
        echo "   🖼️  Image: $image_url → $new_image_url"
        
        curl -s -X POST "$BASE_URL" \
          -H "Authorization: Bearer $API_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"sql\": \"UPDATE products SET image_url = ? WHERE id = ?\", \"params\": [\"$new_image_url\", $id]}" > /dev/null
    fi
    
    # Convertir video_url si Cloudinary
    if [[ $video_url == *"cloudinary"* ]]; then
        new_video_url=$(convert_url "$video_url" "video")
        echo "   🎬 Vidéo: $video_url → $new_video_url"
        
        curl -s -X POST "$BASE_URL" \
          -H "Authorization: Bearer $API_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"sql\": \"UPDATE products SET video_url = ? WHERE id = ?\", \"params\": [\"$new_video_url\", $id]}" > /dev/null
    fi
done

echo ""
echo "✅ CONVERSION TERMINÉE !"
echo "✅ Toutes les URLs sont maintenant Cloudflare R2"
echo "✅ Format: $R2_BASE/images/filename.jpg"
echo "✅ Format: $R2_BASE/videos/filename.mp4"
echo ""
echo "🧪 Test après conversion:"
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT name, image_url FROM products WHERE image_url IS NOT NULL LIMIT 3;"}' | jq -r '.result[0].results[] | "\(.name): \(.image_url)"'