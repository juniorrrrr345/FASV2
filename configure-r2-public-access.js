#!/usr/bin/env node

/**
 * 🔓 CONFIGURATION ACCÈS PUBLIC R2
 * Configure l'accès public au bucket R2 et vérifie les produits
 */

// Configuration Cloudflare
const CLOUDFLARE_CONFIG = {
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512',
  DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID || '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW',
  R2_BUCKET: 'fas-media'
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

// Fonction pour configurer l'accès public R2
async function configurePublicAccess() {
  try {
    console.log('🔓 Configuration de l\'accès public R2...');
    
    // Essayer de créer un domaine public pour le bucket
    const publicDomainResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/r2/buckets/${CLOUDFLARE_CONFIG.R2_BUCKET}/public`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: true
      })
    });
    
    const result = await publicDomainResponse.json();
    
    if (publicDomainResponse.ok) {
      console.log('✅ Accès public R2 configuré');
      console.log(`🔗 Domaine public: ${result.result?.public_url || 'En cours de configuration'}`);
      return result.result?.public_url;
    } else {
      console.log('⚠️  Configuration accès public échouée:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur configuration accès public:', error);
    return null;
  }
}

// Fonction pour lister les fichiers dans R2
async function listR2Files() {
  try {
    console.log('\n📁 Liste des fichiers dans R2...');
    
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/r2/buckets/${CLOUDFLARE_CONFIG.R2_BUCKET}/objects`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok && result.result) {
      const files = result.result;
      console.log(`✅ ${files.length} fichiers trouvés dans R2:`);
      
      const images = files.filter(f => f.key.includes('images/'));
      const videos = files.filter(f => f.key.includes('videos/'));
      
      console.log(`   🖼️  Images: ${images.length}`);
      console.log(`   🎥 Vidéos: ${videos.length}`);
      
      // Afficher quelques exemples
      console.log('\n📋 Exemples de fichiers:');
      files.slice(0, 5).forEach(file => {
        console.log(`   - ${file.key} (${(file.size / 1024).toFixed(1)} KB)`);
      });
      
      return files;
    } else {
      console.log('❌ Erreur liste R2:', result);
      return [];
    }
  } catch (error) {
    console.error('❌ Erreur liste R2:', error);
    return [];
  }
}

// Fonction pour vérifier les produits dans D1
async function checkProductsInD1() {
  try {
    console.log('\n📦 Vérification des produits dans D1...');
    
    const result = await executeD1Query(`
      SELECT 
        id, name, image_url, video_url, 
        CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 ELSE 0 END as has_image,
        CASE WHEN video_url IS NOT NULL AND video_url != '' THEN 1 ELSE 0 END as has_video
      FROM products 
      ORDER BY name 
      LIMIT 10
    `);
    
    const products = result.result?.[0]?.results || [];
    
    console.log(`✅ ${products.length} produits vérifiés:`);
    
    products.forEach(product => {
      console.log(`\n📋 ${product.name} (ID: ${product.id})`);
      console.log(`   🖼️  Image: ${product.has_image ? '✅' : '❌'}`);
      if (product.has_image) {
        console.log(`      ${product.image_url.substring(0, 80)}...`);
      }
      console.log(`   🎥 Vidéo: ${product.has_video ? '✅' : '❌'}`);
      if (product.has_video) {
        console.log(`      ${product.video_url.substring(0, 80)}...`);
      }
    });
    
    return products;
  } catch (error) {
    console.error('❌ Erreur vérification D1:', error);
    return [];
  }
}

// Fonction principale
async function configureAndVerify() {
  console.log('🔧 CONFIGURATION R2 ET VÉRIFICATION FINALE');
  console.log('='.repeat(55));
  
  try {
    // 1. Configurer l'accès public R2
    const publicUrl = await configurePublicAccess();
    
    // 2. Lister les fichiers R2
    const r2Files = await listR2Files();
    
    // 3. Vérifier les produits D1
    const products = await checkProductsInD1();
    
    // 4. Résumé final
    console.log('\n' + '='.repeat(55));
    console.log('📊 RÉSUMÉ FINAL DE LA MIGRATION:');
    console.log(`🪣 Bucket R2: ${CLOUDFLARE_CONFIG.R2_BUCKET} ✅`);
    console.log(`📁 Fichiers R2: ${r2Files.length}`);
    console.log(`📦 Produits D1: ${products.length} (échantillon)`);
    console.log(`🔗 Accès public: ${publicUrl ? '✅' : '⚠️  En cours'}`);
    
    if (publicUrl) {
      console.log(`🌐 URL publique: ${publicUrl}`);
    }
    
    console.log('\n🎉 CONFIGURATION TERMINÉE !');
    console.log('\n💡 Les produits sont maintenant accessibles via l\'API:');
    console.log('   GET /api/products-simple');
    
  } catch (error) {
    console.error('❌ ERREUR CONFIGURATION:', error);
  }
}

// Exécution
if (require.main === module) {
  configureAndVerify().catch(console.error);
}

module.exports = { configureAndVerify };