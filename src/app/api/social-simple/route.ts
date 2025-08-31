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
    const data = await executeSQL(
      'SELECT id, name, url, icon, color, is_active, sort_order, created_at, updated_at FROM social_links ORDER BY sort_order ASC'
    );
    
    if (data.success && data.result?.[0]?.results) {
      return NextResponse.json(data.result[0].results);
    } else {
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('❌ Erreur API réseaux sociaux:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🌐 Création lien social:', body);
    
    // Validation des champs obligatoires
    if (!body.name || !body.url || !body.icon) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: name, url, icon' },
        { status: 400 }
      );
    }

    // Vérifier si le lien existe déjà
    const existingData = await executeSQL('SELECT id FROM social_links WHERE name = ? OR url = ?', [body.name, body.url]);
    if (existingData.result?.[0]?.results?.length > 0) {
      return NextResponse.json(
        { error: 'Un lien social avec ce nom ou cette URL existe déjà' },
        { status: 409 }
      );
    }
    
    // Obtenir le prochain ordre de tri
    const maxOrderData = await executeSQL('SELECT MAX(sort_order) as max_order FROM social_links');
    const nextOrder = (maxOrderData.result?.[0]?.results?.[0]?.max_order || 0) + 1;
    
    // Insérer le lien social
    const insertSQL = `
      INSERT INTO social_links (name, url, icon, color, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const params = [
      body.name,
      body.url,
      body.icon,
      body.color || '#0088cc',
      body.is_active !== false ? 1 : 0,
      nextOrder
    ];

    const result = await executeSQL(insertSQL, params);
    
    if (result.success) {
      console.log('✅ Lien social créé avec succès');
      return NextResponse.json({ 
        success: true, 
        id: result.result?.[0]?.meta?.last_row_id,
        name: body.name
      });
    } else {
      throw new Error('Échec de l\'insertion');
    }
  } catch (error) {
    console.error('❌ Erreur création lien social:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du lien social' },
      { status: 500 }
    );
  }
}