import { NextRequest, NextResponse } from 'next/server';
import d1Simple from '../../../../lib/d1-simple';

// GET - Récupérer les paramètres
export async function GET() {
  try {
    console.log('🔍 GET settings...');
    const settings = await d1Simple.getSettings();
    
    console.log('✅ Settings récupérés:', settings);
    
    if (settings) {
      // Mapper les champs D1 vers le format attendu par le frontend
      const mappedSettings = {
        ...settings,
        backgroundImage: settings.background_image,
        backgroundOpacity: settings.background_opacity,
        backgroundBlur: settings.background_blur,
        shopTitle: settings.shop_name,
        themeColor: settings.theme_color,
        contactInfo: settings.contact_info,
        whatsappLink: settings.whatsapp_link,
        scrollingText: settings.scrolling_text
      };
      
      return NextResponse.json(mappedSettings);
    } else {
      // Retourner des paramètres par défaut si rien trouvé
      return NextResponse.json({
        shop_name: 'FAS',
        background_image: 'https://i.imgur.com/s1rsguc.jpeg',
        background_opacity: 20,
        background_blur: 5,
        backgroundImage: 'https://i.imgur.com/s1rsguc.jpeg',
        backgroundOpacity: 20,
        backgroundBlur: 5
      });
    }
  } catch (error) {
    console.error('❌ Erreur GET settings:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}

// POST - Créer ou mettre à jour les paramètres (pour compatibilité)
export async function POST(request: NextRequest) {
  return PUT(request);
}

// PUT - Mettre à jour les paramètres
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 PUT settings...');
    const body = await request.json();
    
    console.log('📝 Données reçues pour mise à jour:', body);

    // Créer un objet avec tous les champs possibles
    const updateData: any = {};
    
    // Mapper directement tous les champs reçus
    if (body.shopTitle !== undefined) updateData.shop_name = body.shopTitle;
    if (body.shopSubtitle !== undefined) updateData.shop_description = body.shopSubtitle;
    if (body.bannerText !== undefined) updateData.contact_info = body.bannerText;
    if (body.loadingText !== undefined) updateData.shop_description = body.loadingText;
    
    // Gérer WhatsApp dans des colonnes séparées ET contact_info pour compatibilité
    if (body.whatsappLink !== undefined) {
      updateData.whatsapp_link = body.whatsappLink;
      updateData.contact_info = body.whatsappLink; // Pour compatibilité
    }
    if (body.whatsappNumber !== undefined) {
      updateData.whatsapp_number = body.whatsappNumber;
    }
    if (body.titleStyle !== undefined) updateData.theme_color = body.titleStyle;
    if (body.backgroundImage !== undefined) updateData.background_image = body.backgroundImage;
    if (body.backgroundOpacity !== undefined) updateData.background_opacity = parseInt(body.backgroundOpacity);
    if (body.backgroundBlur !== undefined) updateData.background_blur = parseInt(body.backgroundBlur);
    if (body.scrollingText !== undefined) updateData.scrolling_text = body.scrollingText;

    // Champs directs
    if (body.shop_name !== undefined) updateData.shop_name = body.shop_name;
    if (body.admin_password !== undefined) updateData.admin_password = body.admin_password;
    if (body.background_image !== undefined) updateData.background_image = body.background_image;
    if (body.background_opacity !== undefined) updateData.background_opacity = body.background_opacity;
    if (body.background_blur !== undefined) updateData.background_blur = body.background_blur;
    if (body.theme_color !== undefined) updateData.theme_color = body.theme_color;
    if (body.contact_info !== undefined) updateData.contact_info = body.contact_info;
    if (body.shop_description !== undefined) updateData.shop_description = body.shop_description;
    if (body.loading_enabled !== undefined) updateData.loading_enabled = body.loading_enabled;
    if (body.loading_duration !== undefined) updateData.loading_duration = body.loading_duration;

    console.log('🗄️ Données mappées pour D1:', updateData);

    if (Object.keys(updateData).length === 0) {
      console.warn('⚠️ Aucune donnée à mettre à jour');
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    // Construire la requête UPDATE SQL
    const fields = Object.keys(updateData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = Object.values(updateData);
    
    const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512';
    const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb';
    const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW';
    
    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
    
    const sql = `UPDATE settings SET ${setClause} WHERE id = 1`;
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params: values })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    
    if (result.success) {
      // Récupérer les settings mis à jour
      const updatedSettings = await d1Simple.getSettings();
      console.log('✅ Settings mis à jour:', updatedSettings);
      return NextResponse.json(updatedSettings);
    } else {
      throw new Error('Erreur mise à jour settings');
    }
  } catch (error) {
    console.error('❌ Erreur PUT settings:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour des paramètres', details: error.message },
      { status: 500 }
    );
  }
}