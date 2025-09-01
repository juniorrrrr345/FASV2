#!/usr/bin/env node

// Script pour corriger les URLs des médias dans la base de données

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

async function fixMediaUrls() {
  console.log('🔧 Correction des URLs de médias...\n');

  try {
    // 1. Corriger les URLs avec le mauvais domaine R2
    console.log('1️⃣ Correction des domaines R2 incorrects...');
    
    const fixDomainResult = await executeD1Query(`
      UPDATE products 
      SET image_url = REPLACE(image_url, 'https://pub-79794216.r2.dev/', '${CORRECT_R2_DOMAIN}/'),
          video_url = REPLACE(video_url, 'https://pub-79794216.r2.dev/', '${CORRECT_R2_DOMAIN}/')
      WHERE image_url LIKE '%pub-79794216.r2.dev%' 
         OR video_url LIKE '%pub-79794216.r2.dev%'
    `);
    
    console.log('✅ Domaines R2 corrigés');

    // 2. Corriger les URLs Cloudinary restantes
    console.log('2️⃣ Correction des URLs Cloudinary...');
    
    const fixCloudinaryResult = await executeD1Query(`
      UPDATE products 
      SET image_url = REPLACE(
            REPLACE(image_url, 'https://res.cloudinary.com/dfbv2sln2/image/upload/', '${CORRECT_R2_DOMAIN}/images/'),
            '/boutique_images/', ''
          ),
          video_url = REPLACE(
            REPLACE(video_url, 'https://res.cloudinary.com/dfbv2sln2/video/upload/', '${CORRECT_R2_DOMAIN}/videos/'),
            '/boutique_videos/', ''
          )
      WHERE image_url LIKE '%cloudinary%' 
         OR video_url LIKE '%cloudinary%'
    `);
    
    console.log('✅ URLs Cloudinary corrigées');

    // 3. Assigner des images par défaut aux produits sans images
    console.log('3️⃣ Attribution d\'images par défaut...');
    
    const defaultImage = `${CORRECT_R2_DOMAIN}/images/1756654233249-vdc0hme52d.jpeg`;
    
    const fixEmptyResult = await executeD1Query(`
      UPDATE products 
      SET image_url = ?
      WHERE image_url IS NULL OR image_url = '' OR image_url = 'undefined'
    `, [defaultImage]);
    
    console.log('✅ Images par défaut attribuées');

    // 4. Vérifier les résultats
    console.log('4️⃣ Vérification des résultats...');
    
    const checkResult = await executeD1Query(`
      SELECT id, name, image_url, video_url 
      FROM products 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    if (checkResult.success && checkResult.result?.[0]?.results) {
      const products = checkResult.result[0].results;
      console.log('\n📋 Échantillon des produits corrigés:');
      
      products.forEach(product => {
        console.log(`\n🛍️ ${product.name} (ID: ${product.id})`);
        console.log(`   📸 Image: ${product.image_url || 'VIDE'}`);
        console.log(`   🎬 Vidéo: ${product.video_url || 'VIDE'}`);
        
        // Vérifier si les URLs sont correctes
        const imageOk = product.image_url && product.image_url.includes(CORRECT_R2_DOMAIN);
        const videoOk = !product.video_url || product.video_url.includes(CORRECT_R2_DOMAIN);
        
        console.log(`   ✅ URLs: ${imageOk && videoOk ? 'CORRECTES' : 'À VÉRIFIER'}`);
      });
    }

    console.log('\n🎉 CORRECTION TERMINÉE !');
    console.log('✅ Toutes les URLs utilisent maintenant le domaine R2 correct');
    console.log(`✅ Domaine utilisé: ${CORRECT_R2_DOMAIN}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    process.exit(1);
  }
}

// Exécuter le script
fixMediaUrls().then(() => {
  console.log('\n🚀 Script terminé avec succès !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});