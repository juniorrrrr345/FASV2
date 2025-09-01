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
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = body.productId || 31;
    
    // Log pour debug
    console.log('🔍 DEBUG UPDATE - Données reçues:', {
      productId,
      name: body.name,
      category: body.category,
      farm: body.farm,
      image_url: body.image_url,
      hasVideo: !!body.video_url,
      hasPrices: !!body.prices
    });
    
    // 1. Vérifier le produit existe
    const productCheck = await executeSQL('SELECT * FROM products WHERE id = ?', [productId]);
    console.log('📦 Produit existant:', productCheck.result?.[0]?.results?.[0]);
    
    // 2. Vérifier catégorie
    const categoryData = await executeSQL('SELECT id FROM categories WHERE name = ?', [body.category]);
    console.log('📂 Catégorie trouvée:', categoryData.result?.[0]?.results);
    
    // 3. Vérifier farm
    const farmData = await executeSQL('SELECT id FROM farms WHERE name = ?', [body.farm]);
    console.log('🏭 Farm trouvée:', farmData.result?.[0]?.results);
    
    const category_id = categoryData.result?.[0]?.results?.[0]?.id;
    const farm_id = farmData.result?.[0]?.results?.[0]?.id;
    
    if (!category_id || !farm_id) {
      return NextResponse.json({
        error: 'Catégorie ou farm introuvable',
        debug: {
          searchedCategory: body.category,
          searchedFarm: body.farm,
          foundCategoryId: category_id,
          foundFarmId: farm_id
        }
      }, { status: 400 });
    }
    
    // 4. Tester la mise à jour
    const updateSQL = `
      UPDATE products SET
        name = ?, description = ?, category_id = ?, farm_id = ?, 
        image_url = ?, video_url = ?, prices = ?, price = ?, 
        stock = ?, is_available = ?, features = ?, tags = ?, 
        promotions = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    const params = [
      body.name,
      body.description || '',
      category_id,
      farm_id,
      body.image_url,
      body.video_url || '',
      JSON.stringify(body.prices || {}),
      body.price || 0,
      body.stock || 0,
      body.isActive !== false ? 1 : 0,
      JSON.stringify(body.features || []),
      JSON.stringify(body.tags || []),
      JSON.stringify(body.promotions || {}),
      productId
    ];
    
    console.log('🔄 SQL à exécuter:', updateSQL);
    console.log('📝 Paramètres:', params);
    
    const result = await executeSQL(updateSQL, params);
    console.log('📊 Résultat mise à jour:', result);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Produit mis à jour avec succès',
        productId: productId
      });
    } else {
      return NextResponse.json({ 
        error: 'Échec de la mise à jour',
        result: result
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erreur debug update:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}