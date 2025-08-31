import { NextResponse } from 'next/server';
import d1Client from '../../../../lib/cloudflare-d1';

// GET - Récupérer tous les liens sociaux
export async function GET() {
  try {
    const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512';
    const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb';
    const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW';
    
    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: 'SELECT id, name, url, icon, color, is_active, sort_order, created_at, updated_at FROM social_links WHERE (is_active = 1 OR is_active = "true" OR is_active IS NULL) ORDER BY sort_order ASC'
      })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data.success && data.result?.[0]?.results) {
      console.log('🌐 Liens sociaux récupérés:', data.result[0].results.length);
      return NextResponse.json(data.result[0].results);
    } else {
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Erreur récupération liens sociaux:', error);
    return NextResponse.json([]);
  }
}

// POST - Créer un nouveau lien social
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, icon = '🔗', color = '#0088cc', is_active = true, sort_order = 0 } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Le nom et l\'URL sont requis' },
        { status: 400 }
      );
    }

    const socialLinkData = {
      name,
      url,
      icon,
      color,
      is_active: Boolean(is_active),
      sort_order: parseInt(sort_order),
    };

    console.log('🌐 Création lien social Cloudflare:', socialLinkData);
    const newSocialLink = await d1Client.create('social_links', socialLinkData);
    return NextResponse.json(newSocialLink, { status: 201 });
  } catch (error) {
    console.error('Erreur création lien social:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création du lien social' },
      { status: 500 }
    );
  }
}