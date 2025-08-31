import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Configuration Cloudflare
const getCloudflareConfig = () => ({
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512',
  DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID || '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
});

// Fonction utilitaire pour exécuter une requête SQL
const executeSQL = async (sql: string, params: any[] = []) => {
  const { ACCOUNT_ID, DATABASE_ID, API_TOKEN } = getCloudflareConfig();
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export async function GET() {
  try {
    const data = await executeSQL(`
      SELECT 
        p.id, p.name, p.description, p.price, p.prices, 
        p.image_url, p.video_url, p.stock, p.is_available,
        c.name as category_name, f.name as farm_name,
        p.category_id, p.farm_id, p.features, p.tags
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN farms f ON p.farm_id = f.id
      WHERE (p.is_available = 1 OR p.is_available = 'true' OR p.is_available IS NULL)
      ORDER BY p.created_at DESC
    `);
    
    if (data.success && data.result?.[0]?.results) {
      const products = data.result[0].results.map((product: any) => {
        let prices = {};
        let features = [];
        let tags = [];
        
        try {
          prices = JSON.parse(product.prices || '{}');
          features = JSON.parse(product.features || '[]');
          tags = JSON.parse(product.tags || '[]');
        } catch (e) {
          prices = {};
          features = [];
          tags = [];
        }
        
        return {
          _id: product.id,
          id: product.id,
          name: product.name,
          description: product.description || '',
          category: product.category_name || 'Sans catégorie',
          farm: product.farm_name || 'Sans farm',
          category_id: product.category_id,
          farm_id: product.farm_id,
          image_url: product.image_url || '',
          video_url: product.video_url || '',
          prices: prices,
          price: product.price || 0,
          stock: product.stock || 0,
          is_available: product.is_available !== false,
          isActive: product.is_available !== false,
          features: features,
          tags: tags
        };
      });
      
      return NextResponse.json(products);
    } else {
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('❌ Erreur API produits:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📦 Création produit:', body);
    
    // Validation des champs obligatoires
    if (!body.name || !body.category || !body.farm || !body.image_url) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: name, category, farm, image_url' },
        { status: 400 }
      );
    }

    // Récupérer les IDs des catégories et farms
    const categoryData = await executeSQL('SELECT id FROM categories WHERE name = ?', [body.category]);
    const farmData = await executeSQL('SELECT id FROM farms WHERE name = ?', [body.farm]);
    
    const category_id = categoryData.result?.[0]?.results?.[0]?.id;
    const farm_id = farmData.result?.[0]?.results?.[0]?.id;

    if (!category_id || !farm_id) {
      return NextResponse.json(
        { error: 'Catégorie ou farm introuvable' },
        { status: 400 }
      );
    }

    // Préparer les données
    const prices = JSON.stringify(body.prices || {});
    const features = JSON.stringify(body.features || []);
    const tags = JSON.stringify(body.tags || []);
    const promotions = JSON.stringify(body.promotions || {});
    
    // Insérer le produit
    const insertSQL = `
      INSERT INTO products (
        name, description, category_id, farm_id, image_url, video_url,
        prices, price, stock, is_available, features, tags, promotions,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const params = [
      body.name,
      body.description || '',
      category_id,
      farm_id,
      body.image_url,
      body.video_url || '',
      prices,
      body.price || 0,
      body.stock || 0,
      body.isActive !== false ? 1 : 0,
      features,
      tags,
      promotions
    ];

    const result = await executeSQL(insertSQL, params);
    
    if (result.success) {
      console.log('✅ Produit créé avec succès');
      return NextResponse.json({ success: true, id: result.result?.[0]?.meta?.last_row_id });
    } else {
      throw new Error('Échec de l\'insertion');
    }
  } catch (error) {
    console.error('❌ Erreur création produit:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du produit' },
      { status: 500 }
    );
  }
}