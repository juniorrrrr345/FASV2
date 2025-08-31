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

// PUT - Modifier une catégorie
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const categoryId = params.id;
    
    console.log('📝 Modification catégorie:', categoryId, body);
    
    // Validation des champs obligatoires
    if (!body.name) {
      return NextResponse.json(
        { error: 'Le nom de la catégorie est obligatoire' },
        { status: 400 }
      );
    }

    // Vérifier si une autre catégorie avec le même nom existe
    const existingData = await executeSQL('SELECT id FROM categories WHERE name = ? AND id != ?', [body.name, categoryId]);
    if (existingData.result?.[0]?.results?.length > 0) {
      return NextResponse.json(
        { error: 'Une catégorie avec ce nom existe déjà' },
        { status: 409 }
      );
    }
    
    // Mettre à jour la catégorie
    const updateSQL = `
      UPDATE categories SET
        name = ?, description = ?, icon = ?, color = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    const params = [
      body.name,
      body.description || '',
      body.icon || '📦',
      body.color || '#3B82F6',
      categoryId
    ];

    const result = await executeSQL(updateSQL, params);
    
    if (result.success) {
      console.log('✅ Catégorie modifiée avec succès');
      return NextResponse.json({ success: true });
    } else {
      throw new Error('Échec de la modification');
    }
  } catch (error) {
    console.error('❌ Erreur modification catégorie:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de la catégorie' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une catégorie
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const categoryId = params.id;
    console.log('🗑️ Suppression catégorie:', categoryId);
    
    // Vérifier s'il y a des produits associés
    const productsData = await executeSQL('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId]);
    const productCount = productsData.result?.[0]?.results?.[0]?.count || 0;
    
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer cette catégorie car elle contient ${productCount} produit(s)` },
        { status: 409 }
      );
    }
    
    // Supprimer la catégorie
    const deleteSQL = 'DELETE FROM categories WHERE id = ?';
    const result = await executeSQL(deleteSQL, [categoryId]);
    
    if (result.success) {
      console.log('✅ Catégorie supprimée avec succès');
      return NextResponse.json({ success: true });
    } else {
      throw new Error('Échec de la suppression');
    }
  } catch (error) {
    console.error('❌ Erreur suppression catégorie:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la catégorie' },
      { status: 500 }
    );
  }
}