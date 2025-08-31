// Script pour synchroniser les données des réseaux sociaux entre les deux APIs
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
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function syncSocialData() {
  try {
    console.log('🔄 Début de la synchronisation des réseaux sociaux...');
    
    // 1. Récupérer tous les liens sociaux existants
    const allLinksData = await executeSQL('SELECT * FROM social_links ORDER BY id ASC');
    const allLinks = allLinksData.result?.[0]?.results || [];
    
    console.log(`📊 ${allLinks.length} liens sociaux trouvés dans la base`);
    
    if (allLinks.length === 0) {
      console.log('ℹ️ Aucun lien social trouvé, création de liens par défaut...');
      
      // Créer des liens par défaut si aucun n'existe
      const defaultLinks = [
        { name: 'Instagram', url: 'https://instagram.com/votre_compte', icon: '📷', color: '#E4405F', sort_order: 1 },
        { name: 'TikTok', url: 'https://tiktok.com/@votre_compte', icon: '🎵', color: '#000000', sort_order: 2 },
        { name: 'WhatsApp', url: 'https://wa.me/votre_numero', icon: '💬', color: '#25D366', sort_order: 3 }
      ];
      
      for (const link of defaultLinks) {
        const insertSQL = `
          INSERT INTO social_links (name, url, icon, color, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
        `;
        
        await executeSQL(insertSQL, [link.name, link.url, link.icon, link.color, link.sort_order]);
        console.log(`✅ Lien créé: ${link.name}`);
      }
    } else {
      // 2. Vérifier et corriger les champs manquants
      for (const link of allLinks) {
        let needsUpdate = false;
        const updates = [];
        const params = [];
        
        // Vérifier le champ color
        if (!link.color) {
          updates.push('color = ?');
          params.push('#0088cc'); // Couleur par défaut
          needsUpdate = true;
        }
        
        // Vérifier le champ is_active
        if (link.is_active === null || link.is_active === undefined) {
          updates.push('is_active = ?');
          params.push(1); // Actif par défaut
          needsUpdate = true;
        }
        
        // Vérifier le champ sort_order
        if (!link.sort_order) {
          updates.push('sort_order = ?');
          params.push(link.id || 1); // Utiliser l'ID comme ordre par défaut
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          params.push(link.id);
          const updateSQL = `UPDATE social_links SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`;
          await executeSQL(updateSQL, params);
          console.log(`🔧 Lien mis à jour: ${link.name}`);
        }
      }
    }
    
    // 3. Vérifier le résultat final
    const finalData = await executeSQL('SELECT id, name, url, icon, color, is_active, sort_order FROM social_links ORDER BY sort_order ASC');
    const finalLinks = finalData.result?.[0]?.results || [];
    
    console.log('📋 État final des réseaux sociaux:');
    finalLinks.forEach(link => {
      console.log(`  - ${link.name}: ${link.url} (${link.icon}) [${link.is_active ? 'ACTIF' : 'INACTIF'}]`);
    });
    
    console.log('✅ Synchronisation terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
  }
}

// Exécuter la synchronisation
syncSocialData().catch(console.error);