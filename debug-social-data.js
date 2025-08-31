// Script de diagnostic pour les réseaux sociaux
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

async function debugSocialData() {
  try {
    console.log('🔍 === DIAGNOSTIC RÉSEAUX SOCIAUX ===\n');
    
    // 1. Vérifier la structure de la table
    console.log('📋 Structure de la table social_links:');
    try {
      const schemaData = await executeSQL("PRAGMA table_info(social_links)");
      const schema = schemaData.result?.[0]?.results || [];
      schema.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });
    } catch (error) {
      console.log('  ❌ Impossible de récupérer la structure:', error.message);
    }
    
    console.log('\n📊 TOUS les liens sociaux dans la base:');
    const allData = await executeSQL('SELECT * FROM social_links ORDER BY id ASC');
    const allLinks = allData.result?.[0]?.results || [];
    
    if (allLinks.length === 0) {
      console.log('  ❌ AUCUN lien social trouvé dans la base !');
    } else {
      allLinks.forEach((link, index) => {
        console.log(`  ${index + 1}. ID: ${link.id}`);
        console.log(`     Nom: "${link.name}"`);
        console.log(`     URL: "${link.url}"`);
        console.log(`     Icône: "${link.icon}"`);
        console.log(`     Couleur: "${link.color || 'NON DÉFINIE'}"`);
        console.log(`     Actif: ${link.is_active} (type: ${typeof link.is_active})`);
        console.log(`     Ordre: ${link.sort_order || 'NON DÉFINI'}`);
        console.log(`     Créé: ${link.created_at || 'NON DÉFINI'}`);
        console.log('');
      });
    }
    
    console.log('🔍 Liens ACTIFS seulement (filtre côté client):');
    const activeData = await executeSQL("SELECT * FROM social_links WHERE (is_active = 1 OR is_active = 'true' OR is_active IS NULL) ORDER BY sort_order ASC");
    const activeLinks = activeData.result?.[0]?.results || [];
    
    if (activeLinks.length === 0) {
      console.log('  ❌ AUCUN lien social actif trouvé !');
      console.log('  💡 Cela explique pourquoi l\'admin ne les voit pas.');
    } else {
      console.log(`  ✅ ${activeLinks.length} lien(s) actif(s) trouvé(s)`);
      activeLinks.forEach(link => {
        console.log(`    - ${link.name}: ${link.is_active}`);
      });
    }
    
    console.log('\n🔧 RECOMMANDATIONS:');
    if (allLinks.length > 0 && activeLinks.length === 0) {
      console.log('  1. Vos liens sociaux existent mais sont marqués comme inactifs');
      console.log('  2. Activez-les en mettant is_active = 1');
      console.log('  3. Ou modifiez les filtres pour afficher tous les liens');
    } else if (allLinks.length === 0) {
      console.log('  1. Aucun lien social dans la base');
      console.log('  2. Créez-en depuis le panel admin');
    } else {
      console.log('  ✅ Tout semble correct !');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

// Exécuter le diagnostic
debugSocialData().catch(console.error);