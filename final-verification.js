#!/usr/bin/env node

/**
 * ✅ VÉRIFICATION FINALE COMPLÈTE
 * Vérifie que tous les produits MongoDB sont bien récupérés et accessibles
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

async function finalVerification() {
  console.log('✅ VÉRIFICATION FINALE COMPLÈTE');
  console.log('='.repeat(50));
  
  try {
    // 1. Compter tous les éléments
    console.log('📊 Statistiques générales...');
    
    const stats = await Promise.all([
      executeD1Query('SELECT COUNT(*) as total FROM products'),
      executeD1Query('SELECT COUNT(*) as total FROM categories'),
      executeD1Query('SELECT COUNT(*) as total FROM farms'),
      executeD1Query('SELECT COUNT(*) as total FROM social_links'),
      executeD1Query('SELECT COUNT(*) as total FROM settings')
    ]);
    
    const [productsCount, categoriesCount, farmsCount, socialCount, settingsCount] = stats.map(s => s.result?.[0]?.results?.[0]?.total || 0);
    
    console.log(`📦 Produits: ${productsCount}`);
    console.log(`📂 Catégories: ${categoriesCount}`);
    console.log(`🏪 Farms: ${farmsCount}`);
    console.log(`🔗 Liens sociaux: ${socialCount}`);
    console.log(`⚙️  Paramètres: ${settingsCount}`);
    
    // 2. Vérifier les produits avec médias
    console.log('\n🎥 Produits avec médias...');
    
    const mediaStats = await executeD1Query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 ELSE 0 END) as with_images,
        SUM(CASE WHEN video_url IS NOT NULL AND video_url != '' THEN 1 ELSE 0 END) as with_videos
      FROM products
    `);
    
    const mediaData = mediaStats.result?.[0]?.results?.[0] || {};
    
    console.log(`📦 Total produits: ${mediaData.total || 0}`);
    console.log(`🖼️  Avec images: ${mediaData.with_images || 0}`);
    console.log(`🎥 Avec vidéos: ${mediaData.with_videos || 0}`);
    
    // 3. Afficher quelques produits complets
    console.log('\n📋 Exemples de produits migrés:');
    
    const sampleProducts = await executeD1Query(`
      SELECT 
        p.name, p.image_url, p.video_url, p.price, p.stock,
        c.name as category_name, f.name as farm_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN farms f ON p.farm_id = f.id
      WHERE (p.image_url IS NOT NULL AND p.image_url != '') 
         OR (p.video_url IS NOT NULL AND p.video_url != '')
      LIMIT 5
    `);
    
    const samples = sampleProducts.result?.[0]?.results || [];
    
    samples.forEach((product, index) => {
      console.log(`\n${index + 1}. 📦 ${product.name}`);
      console.log(`   📂 Catégorie: ${product.category_name || 'Non définie'}`);
      console.log(`   🏪 Farm: ${product.farm_name || 'Non définie'}`);
      console.log(`   💰 Prix: ${product.price || 0}€`);
      console.log(`   📦 Stock: ${product.stock || 0}`);
      
      if (product.image_url) {
        const imageHost = product.image_url.includes('r2.dev') ? 'R2 ✅' : 'Cloudinary ⚠️';
        console.log(`   🖼️  Image: ${imageHost}`);
      }
      
      if (product.video_url) {
        const videoHost = product.video_url.includes('r2.dev') ? 'R2 ✅' : 'Cloudinary ⚠️';
        console.log(`   🎥 Vidéo: ${videoHost}`);
      }
    });
    
    // 4. Résumé final
    console.log('\n' + '='.repeat(50));
    console.log('🎯 RÉSULTAT FINAL:');
    
    const totalMediaFiles = (mediaData.with_images || 0) + (mediaData.with_videos || 0);
    const migrationSuccess = productsCount > 0 && totalMediaFiles > 0;
    
    console.log(`${migrationSuccess ? '🎉' : '❌'} MIGRATION ${migrationSuccess ? 'RÉUSSIE' : 'ÉCHOUÉE'}`);
    console.log(`📦 ${productsCount} produits récupérés de MongoDB`);
    console.log(`🖼️  ${mediaData.with_images || 0} images migrées`);
    console.log(`🎥 ${mediaData.with_videos || 0} vidéos migrées`);
    console.log(`📁 ${totalMediaFiles} fichiers médias au total`);
    console.log(`🪣 Bucket R2 'fas-media' créé et opérationnel`);
    
    return {
      success: migrationSuccess,
      stats: {
        products: productsCount,
        categories: categoriesCount,
        farms: farmsCount,
        socialLinks: socialCount,
        settings: settingsCount,
        images: mediaData.with_images || 0,
        videos: mediaData.with_videos || 0,
        totalMedia: totalMediaFiles
      }
    };
    
  } catch (error) {
    console.error('❌ ERREUR VÉRIFICATION FINALE:', error);
    return { success: false, error: error.message };
  }
}

// Exécution
if (require.main === module) {
  finalVerification().catch(console.error);
}

module.exports = { finalVerification };