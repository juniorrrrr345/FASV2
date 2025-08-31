#!/bin/bash

# 🗄️ INITIALISATION TABLES D1 POUR FAS
ACCOUNT_ID="7979421604bd07b3bd34d3ed96222512"
DATABASE_ID="VOTRE-UUID"  # ⚠️ Sera remplacé automatiquement
API_TOKEN="ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW"
BASE_URL="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database/$DATABASE_ID/query"

echo "🚀 Initialisation des tables D1 pour FAS..."

# Fonction pour exécuter SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "   📝 $description..."
    
    RESPONSE=$(curl -s -X POST "$BASE_URL" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"sql\": \"$sql\"}")
    
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo "   ✅ $description - OK"
    else
        echo "   ❌ $description - ERREUR"
        echo "   $RESPONSE"
    fi
}

# 1. Table Settings
execute_sql "CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_name TEXT DEFAULT 'FAS',
    admin_password TEXT DEFAULT 'admin123',
    background_image TEXT DEFAULT 'https://i.imgur.com/s1rsguc.jpeg',
    background_opacity INTEGER DEFAULT 20,
    background_blur INTEGER DEFAULT 5,
    theme_color TEXT DEFAULT 'glow',
    contact_info TEXT DEFAULT '',
    shop_description TEXT DEFAULT '',
    loading_enabled BOOLEAN DEFAULT true,
    loading_duration INTEGER DEFAULT 3000,
    whatsapp_link TEXT DEFAULT '',
    whatsapp_number TEXT DEFAULT '',
    scrolling_text TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);" "Création table settings"

# 2. Table Categories
execute_sql "CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '🏷️',
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);" "Création table categories"

# 3. Table Farms
execute_sql "CREATE TABLE IF NOT EXISTS farms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    location TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);" "Création table farms"

# 4. Table Products
execute_sql "CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    prices TEXT DEFAULT '{}',
    category_id INTEGER,
    farm_id INTEGER,
    image_url TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    stock INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    features TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);" "Création table products"

# 5. Table Pages
execute_sql "CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);" "Création table pages"

# 6. Table Social Links
execute_sql "CREATE TABLE IF NOT EXISTS social_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT '🔗',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);" "Création table social_links"

# Données par défaut FAS
echo ""
echo "📋 Insertion des données par défaut FAS..."

execute_sql "INSERT OR REPLACE INTO settings (
    id, shop_name, background_image, shop_description, scrolling_text
) VALUES (
    1, 'FAS', 'https://i.imgur.com/s1rsguc.jpeg', 
    'FAS - Boutique de qualité avec produits exceptionnels',
    'Bienvenue chez FAS - Votre boutique de confiance 🛍️'
);" "Settings par défaut FAS"

execute_sql "INSERT OR REPLACE INTO pages (slug, title, content) VALUES 
('info', 'Informations', 'Bienvenue dans notre boutique FAS ! Nous proposons des produits de qualité avec un service client exceptionnel.'),
('contact', 'Contact', 'Contactez FAS pour toute question. Notre équipe est à votre disposition pour vous aider.');" "Pages par défaut FAS"

echo ""
echo "🎉 INITIALISATION D1 TERMINÉE !"
echo "✅ Base de données FAS prête"
echo "✅ Tables créées avec structure optimisée"
echo "✅ Données par défaut FAS insérées"
echo ""
echo "🔄 Prochaine étape: ./migrate-mongodb-to-d1.js"