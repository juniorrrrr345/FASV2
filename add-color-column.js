// Script pour ajouter la colonne color à la table social_links
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512';
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW';

async function executeSQL(sql, params = []) {
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
}

async function addColorColumn() {
  try {
    console.log('🔧 Ajout de la colonne color à social_links...');
    
    // Vérifier si la colonne existe déjà
    const schemaData = await executeSQL("PRAGMA table_info(social_links)");
    const schema = schemaData.result?.[0]?.results || [];
    const hasColorColumn = schema.some(col => col.name === 'color');
    
    if (hasColorColumn) {
      console.log('✅ La colonne color existe déjà');
    } else {
      console.log('➕ Ajout de la colonne color...');
      await executeSQL("ALTER TABLE social_links ADD COLUMN color TEXT DEFAULT '#0088cc'");
      console.log('✅ Colonne color ajoutée avec succès');
    }
    
    // Maintenant mettre à jour les couleurs
    const colorMap = {
      'signal': '#3A76F0',
      'instagram': '#E4405F', 
      'telegram': '#0088cc',
      'potato': '#8B4513',
      'whatsapp': '#25D366',
      'tiktok': '#000000',
      'facebook': '#1877F2',
      'twitter': '#1DA1F2',
      'snapchat': '#FFFC00',
      'youtube': '#FF0000'
    };
    
    // Récupérer tous les liens
    const linksData = await executeSQL('SELECT id, name, color FROM social_links');
    const links = linksData.result?.[0]?.results || [];
    
    console.log('\n🎨 Mise à jour des couleurs:');
    for (const link of links) {
      if (!link.color || link.color === 'NON DÉFINIE') {
        const colorKey = link.name.toLowerCase().trim();
        const color = colorMap[colorKey] || '#0088cc';
        
        await executeSQL('UPDATE social_links SET color = ? WHERE id = ?', [color, link.id]);
        console.log(`  🎨 ${link.name}: ${color}`);
      }
    }
    
    // Vérification finale
    console.log('\n📋 Vérification finale:');
    const finalData = await executeSQL('SELECT id, name, url, icon, color, is_active, sort_order FROM social_links ORDER BY sort_order ASC');
    const finalLinks = finalData.result?.[0]?.results || [];
    
    finalLinks.forEach(link => {
      console.log(`  ✅ ${link.name}: ${link.color} (${link.icon})`);
    });
    
    console.log('\n🎉 Correction terminée ! Les réseaux sociaux devraient maintenant apparaître dans l\'admin.');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter la correction
addColorColumn().catch(console.error);