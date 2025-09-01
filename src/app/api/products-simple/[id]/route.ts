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

// PUT - Modifier un produit
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const productId = parseInt(params.id);
    
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
        { 
          error: 'Catégorie ou farm introuvable',
          searchedCategory: body.category,
          searchedFarm: body.farm
        },
        { status: 400 }
      );
    }

    // Préparer les données - SIMPLIFIÉES
    const prices = JSON.stringify(body.prices || {});
    const features = JSON.stringify(body.features || []);
    const tags = JSON.stringify(body.tags || []);
    const promotions = JSON.stringify(body.promotions || {});
    
    // Mettre à jour le produit - REQUÊTE SIMPLIFIÉE
    const updateSQL = `
      UPDATE products SET
        name = ?, description = ?, category_id = ?, farm_id = ?, 
        image_url = ?, video_url = ?, prices = ?, price = ?, 
        stock = ?, is_available = ?, features = ?, tags = ?, 
        promotions = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    const updateParams = [
      body.name,
      body.description || '',
      category_id,
      farm_id,
      body.image_url,
      body.video_url || '',
      prices,
      parseFloat(body.price) || 0,
      parseInt(body.stock) || 0,
      body.isActive !== false ? 1 : 0,
      features,
      tags,
      promotions,
      productId
    ];

    const result = await executeSQL(updateSQL, updateParams);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      throw new Error(`Échec de la modification: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erreur lors de la modification du produit',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un produit
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id;
    console.log('🗑️ Suppression produit:', productId);
    
    // Supprimer le produit
    const deleteSQL = 'DELETE FROM products WHERE id = ?';
    const result = await executeSQL(deleteSQL, [productId]);
    
    if (result.success) {
      console.log('✅ Produit supprimé avec succès');
      return NextResponse.json({ success: true });
    } else {
      throw new Error('Échec de la suppression');
    }
  } catch (error) {
    console.error('❌ Erreur suppression produit:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du produit' },
      { status: 500 }
    );
  }
}