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
      'SELECT id, name, description, location, contact, created_at, updated_at FROM farms ORDER BY name ASC'
    );
    
    if (data.success && data.result?.[0]?.results) {
      return NextResponse.json(data.result[0].results);
    } else {
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('❌ Erreur API farms:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🏭 Création farm:', body);
    
    // Validation des champs obligatoires
    if (!body.name) {
      return NextResponse.json(
        { error: 'Le nom de la farm est obligatoire' },
        { status: 400 }
      );
    }

    // Vérifier si la farm existe déjà
    const existingData = await executeSQL('SELECT id FROM farms WHERE name = ?', [body.name]);
    if (existingData.result?.[0]?.results?.length > 0) {
      return NextResponse.json(
        { error: 'Une farm avec ce nom existe déjà' },
        { status: 409 }
      );
    }
    
    // Insérer la farm
    const insertSQL = `
      INSERT INTO farms (name, description, location, contact, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const params = [
      body.name,
      body.description || '',
      body.location || '',
      body.contact || ''
    ];

    const result = await executeSQL(insertSQL, params);
    
    if (result.success) {
      console.log('✅ Farm créée avec succès');
      return NextResponse.json({ 
        success: true, 
        id: result.result?.[0]?.meta?.last_row_id,
        name: body.name
      });
    } else {
      throw new Error('Échec de l\'insertion');
    }
  } catch (error) {
    console.error('❌ Erreur création farm:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la farm' },
      { status: 500 }
    );
  }
}