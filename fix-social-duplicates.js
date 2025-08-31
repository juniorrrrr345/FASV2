// Script pour nettoyer les doublons et ajouter les couleurs manquantes
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

async function fixSocialData() {
  try {
    console.log('🔧 === NETTOYAGE DES RÉSEAUX SOCIAUX ===\n');
    
    // 1. Récupérer tous les liens
    const allData = await executeSQL('SELECT * FROM social_links ORDER BY id ASC');
    const allLinks = allData.result?.[0]?.results || [];
    
    console.log(`📊 ${allLinks.length} liens trouvés`);
    
    // 2. Identifier et supprimer les doublons (garder le plus récent)
    const uniqueLinks = new Map();
    const toDelete = [];
    
    allLinks.forEach(link => {
      const key = `${link.name.toLowerCase()}-${link.url}`;
      if (uniqueLinks.has(key)) {
        // Doublon trouvé - marquer l'ancien pour suppression
        const existing = uniqueLinks.get(key);
        if (link.id > existing.id) {
          // Le nouveau est plus récent, supprimer l'ancien
          toDelete.push(existing.id);
          uniqueLinks.set(key, link);
        } else {
          // L'ancien est plus récent, supprimer le nouveau
          toDelete.push(link.id);
        }
      } else {
        uniqueLinks.set(key, link);
      }
    });
    
    console.log(`🗑️ ${toDelete.length} doublons à supprimer:`, toDelete);
    
    // Supprimer les doublons
    for (const id of toDelete) {
      await executeSQL('DELETE FROM social_links WHERE id = ?', [id]);
      console.log(`  ✅ Supprimé doublon ID: ${id}`);
    }
    
    // 3. Ajouter les couleurs manquantes et corriger les données
    const colorMap = {
      'instagram': '#E4405F',
      'signal': '#3A76F0',
      'telegram': '#0088cc',
      'potato': '#8B4513',
      'whatsapp': '#25D366',
      'tiktok': '#000000',
      'facebook': '#1877F2',
      'twitter': '#1DA1F2',
      'snapchat': '#FFFC00',
      'youtube': '#FF0000'
    };
    
    // Récupérer les liens restants après nettoyage
    const cleanData = await executeSQL('SELECT * FROM social_links ORDER BY id ASC');
    const cleanLinks = cleanData.result?.[0]?.results || [];
    
    console.log('\n🎨 Mise à jour des couleurs et données:');
    
    for (const link of cleanLinks) {
      const updates = [];
      const params = [];
      
      // Ajouter couleur si manquante
      if (!link.color) {
        const colorKey = link.name.toLowerCase().trim();
        const color = colorMap[colorKey] || '#0088cc';
        updates.push('color = ?');
        params.push(color);
        console.log(`  🎨 ${link.name}: ${color}`);
      }
      
      // Corriger sort_order si manquant
      if (!link.sort_order) {
        updates.push('sort_order = ?');
        params.push(link.id);
      }
      
      // S'assurer que is_active est un boolean
      if (typeof link.is_active === 'string') {
        updates.push('is_active = ?');
        params.push(link.is_active === 'true' ? 1 : 0);
      }
      
      if (updates.length > 0) {
        params.push(link.id);
        const updateSQL = `UPDATE social_links SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`;
        await executeSQL(updateSQL, params);
        console.log(`  ✅ Mis à jour: ${link.name}`);
      }
    }
    
    // 4. Vérification finale
    console.log('\n📋 ÉTAT FINAL:');
    const finalData = await executeSQL('SELECT id, name, url, icon, color, is_active, sort_order FROM social_links ORDER BY sort_order ASC');
    const finalLinks = finalData.result?.[0]?.results || [];
    
    finalLinks.forEach(link => {
      console.log(`  ✅ ${link.name}: ${link.url}`);
      console.log(`     Icône: ${link.icon} | Couleur: ${link.color} | Actif: ${link.is_active} | Ordre: ${link.sort_order}`);
    });
    
    console.log(`\n🎉 Nettoyage terminé ! ${finalLinks.length} liens sociaux prêts.`);
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Exécuter le nettoyage
fixSocialData().catch(console.error);