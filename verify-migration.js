#!/usr/bin/env node

/**
 * 🔍 VÉRIFICATION DE LA MIGRATION
 * Vérifie que tous les produits ont bien été migrés vers D1 avec leurs médias
 */

// Configuration Cloudflare
const CLOUDFLARE_CONFIG = {
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512',
  DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID || '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

// Fonction pour exécuter des requêtes SQL sur D1
async function executeD1Query(sql, params = []) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/d1/database/${CLOUDFLARE_CONFIG.DATABASE_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`D1 Query failed: ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
}

async function verifyMigration() {
  console.log('🔍 VÉRIFICATION DE LA MIGRATION');
  console.log('='.repeat(50));
  
  try {
    // 1. Vérifier les catégories
    console.log('\n📂 Vérification des catégories...');
    const categoriesResult = await executeD1Query('SELECT * FROM categories ORDER BY name');
    const categories = categoriesResult.result?.[0]?.results || [];
    console.log(`✅ ${categories.length} catégories trouvées:`);
    categories.forEach(cat => console.log(`   - ${cat.name} (${cat.icon})`));
    
    // 2. Vérifier les farms
    console.log('\n🏪 Vérification des farms...');
    const farmsResult = await executeD1Query('SELECT * FROM farms ORDER BY name');
    const farms = farmsResult.result?.[0]?.results || [];
    console.log(`✅ ${farms.length} farms trouvées:`);
    farms.forEach(farm => console.log(`   - ${farm.name}`));
    
    // 3. Vérifier les produits
    console.log('\n📦 Vérification des produits...');
    const productsResult = await executeD1Query(`
      SELECT 
        p.id, p.name, p.image_url, p.video_url, p.is_available,
        c.name as category_name, f.name as farm_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN farms f ON p.farm_id = f.id
      ORDER BY p.name
    `);
    const products = productsResult.result?.[0]?.results || [];
    console.log(`✅ ${products.length} produits trouvés:`);
    
    let productsWithImages = 0;
    let productsWithVideos = 0;
    
    products.forEach(product => {
      const hasImage = product.image_url && product.image_url.trim() !== '';
      const hasVideo = product.video_url && product.video_url.trim() !== '';
      
      if (hasImage) productsWithImages++;
      if (hasVideo) productsWithVideos++;
      
      console.log(`   📋 ${product.name}`);
      console.log(`      Catégorie: ${product.category_name || 'Non définie'}`);
      console.log(`      Farm: ${product.farm_name || 'Non définie'}`);
      console.log(`      Image: ${hasImage ? '✅' : '❌'} ${hasImage ? product.image_url.substring(0, 60) + '...' : ''}`);
      console.log(`      Vidéo: ${hasVideo ? '✅' : '❌'} ${hasVideo ? product.video_url.substring(0, 60) + '...' : ''}`);
      console.log(`      Disponible: ${product.is_available ? '✅' : '❌'}`);
      console.log('');
    });
    
    // 4. Vérifier les liens sociaux
    console.log('\n🔗 Vérification des liens sociaux...');
    const socialResult = await executeD1Query('SELECT * FROM social_links ORDER BY name');
    const socialLinks = socialResult.result?.[0]?.results || [];
    console.log(`✅ ${socialLinks.length} liens sociaux trouvés:`);
    socialLinks.forEach(link => console.log(`   - ${link.name}: ${link.url}`));
    
    // 5. Vérifier les paramètres
    console.log('\n⚙️  Vérification des paramètres...');
    const settingsResult = await executeD1Query('SELECT * FROM settings LIMIT 1');
    const settings = settingsResult.result?.[0]?.results?.[0] || null;
    if (settings) {
      console.log(`✅ Paramètres trouvés:`);
      console.log(`   - Nom boutique: ${settings.shop_name}`);
      console.log(`   - Description: ${settings.shop_description}`);
      console.log(`   - Texte défilant: ${settings.scrolling_text}`);
    } else {
      console.log('❌ Aucun paramètre trouvé');
    }
    
    // 6. Résumé final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ DE LA VÉRIFICATION:');
    console.log(`📂 Catégories: ${categories.length}`);
    console.log(`🏪 Farms: ${farms.length}`);
    console.log(`📦 Produits: ${products.length}`);
    console.log(`🖼️  Produits avec images: ${productsWithImages}`);
    console.log(`🎥 Produits avec vidéos: ${productsWithVideos}`);
    console.log(`🔗 Liens sociaux: ${socialLinks.length}`);
    console.log(`⚙️  Paramètres: ${settings ? '1' : '0'}`);
    
    const migrationSuccess = products.length > 0 && categories.length > 0 && farms.length > 0;
    console.log(`\n${migrationSuccess ? '🎉' : '❌'} MIGRATION ${migrationSuccess ? 'RÉUSSIE' : 'ÉCHOUÉE'} !`);
    
    return {
      success: migrationSuccess,
      stats: {
        categories: categories.length,
        farms: farms.length,
        products: products.length,
        productsWithImages,
        productsWithVideos,
        socialLinks: socialLinks.length,
        settings: settings ? 1 : 0
      }
    };
    
  } catch (error) {
    console.error('❌ ERREUR VÉRIFICATION:', error);
    return { success: false, error: error.message };
  }
}

// Exécution
if (require.main === module) {
  verifyMigration().catch(console.error);
}

module.exports = { verifyMigration };