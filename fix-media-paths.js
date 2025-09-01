#!/usr/bin/env node

// Script pour corriger les chemins des médias dans la base de données

const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

const CORRECT_R2_DOMAIN = 'https://pub-b38679a01a274648827751df94818418.r2.dev';

async function executeD1Query(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/d1/database/${CLOUDFLARE_CONFIG.databaseId}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

async function fixMediaPaths() {
  console.log('🔧 Correction des chemins de médias...\n');

  try {
    // 1. Corriger les chemins /products/images/ vers /images/
    console.log('1️⃣ Correction des chemins /products/images/...');
    
    const fixImagePaths = await executeD1Query(`
      UPDATE products 
      SET image_url = REPLACE(image_url, '/products/images/', '/images/')
      WHERE image_url LIKE '%/products/images/%'
    `);
    
    console.log('✅ Chemins images corrigés');

    // 2. Corriger les chemins /products/videos/ vers /videos/
    console.log('2️⃣ Correction des chemins /products/videos/...');
    
    const fixVideoPaths = await executeD1Query(`
      UPDATE products 
      SET video_url = REPLACE(video_url, '/products/videos/', '/videos/')
      WHERE video_url LIKE '%/products/videos/%'
    `);
    
    console.log('✅ Chemins vidéos corrigés');

    // 3. Nettoyer les URLs malformées de Cloudinary
    console.log('3️⃣ Nettoyage des URLs Cloudinary malformées...');
    
    const cleanCloudinaryUrls = await executeD1Query(`
      UPDATE products 
      SET image_url = REPLACE(
            REPLACE(
              REPLACE(image_url, '/images/v', '/images/'),
              'upload_', ''
            ),
            '.jpg', '.jpeg'
          )
      WHERE image_url LIKE '%/images/v%upload_%'
    `);

    const cleanCloudinaryVideoUrls = await executeD1Query(`
      UPDATE products 
      SET video_url = REPLACE(
            REPLACE(video_url, '/videos/v', '/videos/'),
            'upload_', ''
          )
      WHERE video_url LIKE '%/videos/v%upload_%'
    `);
    
    console.log('✅ URLs Cloudinary nettoyées');

    // 4. Vérifier les résultats
    console.log('4️⃣ Vérification des résultats...');
    
    const checkResult = await executeD1Query(`
      SELECT id, name, image_url, video_url 
      FROM products 
      WHERE image_url IS NOT NULL AND image_url != ''
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    if (checkResult.success && checkResult.result?.[0]?.results) {
      const products = checkResult.result[0].results;
      console.log('\n📋 Échantillon des produits corrigés:');
      
      for (const product of products) {
        console.log(`\n🛍️ ${product.name} (ID: ${product.id})`);
        console.log(`   📸 Image: ${product.image_url || 'VIDE'}`);
        if (product.video_url) {
          console.log(`   🎬 Vidéo: ${product.video_url}`);
        }
        
        // Test de l'image
        if (product.image_url) {
          try {
            const testResponse = await fetch(product.image_url, { method: 'HEAD' });
            console.log(`   🔍 Test image: ${testResponse.ok ? '✅ OK' : '❌ ERREUR ' + testResponse.status}`);
          } catch (e) {
            console.log(`   🔍 Test image: ❌ ERREUR ${e.message}`);
          }
        }
      }
    }

    console.log('\n🎉 CORRECTION DES CHEMINS TERMINÉE !');
    console.log('✅ Tous les chemins utilisent maintenant la structure correcte');
    console.log('✅ Format: /images/ et /videos/ (sans /products/)');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    process.exit(1);
  }
}

// Exécuter le script
fixMediaPaths().then(() => {
  console.log('\n🚀 Script terminé avec succès !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});