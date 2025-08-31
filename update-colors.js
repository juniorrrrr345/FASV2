// Script pour mettre à jour les couleurs spécifiquement
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

async function updateColors() {
  try {
    console.log('🎨 Mise à jour des couleurs des réseaux sociaux...');
    
    // Couleurs spécifiques pour chaque réseau
    const updates = [
      { name: 'Signal', color: '#3A76F0' },
      { name: 'Instagram', color: '#E4405F' },
      { name: 'Telegram', color: '#0088cc' },
      { name: 'Potato', color: '#8B4513' }
    ];
    
    for (const update of updates) {
      try {
        const result = await executeSQL(
          'UPDATE social_links SET color = ? WHERE name LIKE ?', 
          [update.color, `%${update.name}%`]
        );
        console.log(`✅ ${update.name}: ${update.color}`);
      } catch (error) {
        console.log(`❌ Erreur pour ${update.name}:`, error.message);
      }
    }
    
    // Vérification
    const finalData = await executeSQL('SELECT id, name, color FROM social_links ORDER BY id ASC');
    const finalLinks = finalData.result?.[0]?.results || [];
    
    console.log('\n📋 Résultat final:');
    finalLinks.forEach(link => {
      console.log(`  ${link.id}. ${link.name}: ${link.color}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

updateColors().catch(console.error);