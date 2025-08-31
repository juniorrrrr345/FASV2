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

// PUT - Modifier un lien social
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const linkId = params.id;
    
    console.log('📝 Modification lien social:', linkId, body);
    
    // Validation des champs obligatoires
    if (!body.name || !body.url || !body.icon) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: name, url, icon' },
        { status: 400 }
      );
    }

    // Vérifier si un autre lien avec le même nom/URL existe
    const existingData = await executeSQL('SELECT id FROM social_links WHERE (name = ? OR url = ?) AND id != ?', [body.name, body.url, linkId]);
    if (existingData.result?.[0]?.results?.length > 0) {
      return NextResponse.json(
        { error: 'Un lien social avec ce nom ou cette URL existe déjà' },
        { status: 409 }
      );
    }
    
    // Mettre à jour le lien social
    const updateSQL = `
      UPDATE social_links SET
        name = ?, url = ?, icon = ?, color = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    const params = [
      body.name,
      body.url,
      body.icon,
      body.color || '#0088cc',
      body.is_active !== false ? 1 : 0,
      linkId
    ];

    const result = await executeSQL(updateSQL, params);
    
    if (result.success) {
      console.log('✅ Lien social modifié avec succès');
      return NextResponse.json({ success: true });
    } else {
      throw new Error('Échec de la modification');
    }
  } catch (error) {
    console.error('❌ Erreur modification lien social:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification du lien social' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un lien social
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const linkId = params.id;
    console.log('🗑️ Suppression lien social:', linkId);
    
    // Supprimer le lien social
    const deleteSQL = 'DELETE FROM social_links WHERE id = ?';
    const result = await executeSQL(deleteSQL, [linkId]);
    
    if (result.success) {
      console.log('✅ Lien social supprimé avec succès');
      return NextResponse.json({ success: true });
    } else {
      throw new Error('Échec de la suppression');
    }
  } catch (error) {
    console.error('❌ Erreur suppression lien social:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du lien social' },
      { status: 500 }
    );
  }
}