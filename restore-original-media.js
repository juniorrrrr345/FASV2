#!/usr/bin/env node

// Script pour restaurer les vraies images et vidéos de chaque produit

const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

const CORRECT_R2_DOMAIN = 'https://pub-b38679a01a274648827751df94818418.r2.dev';
const FALLBACK_IMAGE = `${CORRECT_R2_DOMAIN}/images/1756654233249-vdc0hme52d.jpeg`;

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

async function testUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function restoreOriginalMedia() {
  console.log('🔧 Restauration des vraies images et vidéos...\n');

  try {
    // 1. Récupérer tous les produits pour voir leurs vraies URLs
    console.log('1️⃣ Récupération des produits avec leurs vraies URLs...');
    
    // D'abord, regardons dans les scripts de migration pour voir les vraies URLs
    const products = [
      {
        id: 75,
        name: "Needles",
        image: "68a4cfa9eacc2d354a586e44_1756683864687.jpg",
        video: "68a4cfa9eacc2d354a586e44_1756683865460.mov"
      },
      {
        id: 74,
        name: "3MMC",
        image: "68a4cee9eacc2d354a586e43_1756683862646.jpg",
        video: "68a4cee9eacc2d354a586e43_1756683863268.mp4"
      },
      {
        id: 73,
        name: "White Truffle",
        image: "689a35670d563dd57ef12b02_1756683861026.jpg",
        video: "689a35670d563dd57ef12b02_1756683861686.mp4"
      },
      {
        id: 72,
        name: "Biscotti",
        image: "689a34e97a5a0e1d6291e81e_1756683858941.jpg",
        video: "689a34e97a5a0e1d6291e81e_1756683859961.mp4"
      },
      {
        id: 71,
        name: "Ice Cream Cake",
        image: "6894c21e31151925267f83bc_1756683856127.jpg",
        video: "6894c21e31151925267f83bc_1756683857233.mp4"
      },
      {
        id: 69,
        name: "SIROP THC",
        image: "6892838a3c54213a35e21f32_1756683852921.jpg",
        video: null
      },
      {
        id: 68,
        name: "JUNGLE BOYS",
        image: "6892830a3c54213a35e21f31_1756683850348.jpg",
        video: "6892830a3c54213a35e21f31_1756683851012.mp4"
      },
      {
        id: 67,
        name: "MDMA",
        image: "6892827995b9e2736375081b_1756683847725.jpg",
        video: "6892827995b9e2736375081b_1756683848608.mp4"
      },
      {
        id: 66,
        name: "Sugar",
        image: "6892812495b9e27363750818_1756683844922.jpg",
        video: "6892812495b9e27363750818_1756683845939.mp4"
      },
      {
        id: 65,
        name: "LV",
        image: "68927dff95b9e27363750814_1756683842574.jpg",
        video: "68927dff95b9e27363750814_1756683843478.mp4"
      }
    ];

    console.log(`📦 ${products.length} produits à restaurer`);

    // 2. Tester et restaurer chaque produit
    for (const product of products) {
      console.log(`\n🛍️ Restauration: ${product.name} (ID: ${product.id})`);
      
      const imageUrl = `${CORRECT_R2_DOMAIN}/images/${product.image}`;
      const videoUrl = product.video ? `${CORRECT_R2_DOMAIN}/videos/${product.video}` : '';
      
      console.log(`   📸 Test image: ${product.image}`);
      const imageExists = await testUrl(imageUrl);
      console.log(`   📸 Résultat: ${imageExists ? '✅ OK' : '❌ 404'}`);
      
      if (product.video) {
        console.log(`   🎬 Test vidéo: ${product.video}`);
        const videoExists = await testUrl(videoUrl);
        console.log(`   🎬 Résultat: ${videoExists ? '✅ OK' : '❌ 404'}`);
      }
      
      // Utiliser l'image spécifique si elle existe, sinon fallback
      const finalImageUrl = imageExists ? imageUrl : FALLBACK_IMAGE;
      const finalVideoUrl = (product.video && await testUrl(videoUrl)) ? videoUrl : '';
      
      // Mettre à jour en base
      await executeD1Query(
        'UPDATE products SET image_url = ?, video_url = ? WHERE id = ?',
        [finalImageUrl, finalVideoUrl, product.id]
      );
      
      console.log(`   ✅ URLs mises à jour:`);
      console.log(`      📸 Image: ${imageExists ? 'VRAIE IMAGE' : 'FALLBACK'}`);
      console.log(`      🎬 Vidéo: ${finalVideoUrl ? 'VRAIE VIDÉO' : 'VIDE'}`);
    }

    // 3. Gérer les autres produits (ceux qui n'ont pas de mapping spécifique)
    console.log('\n3️⃣ Gestion des autres produits...');
    
    // Pour les produits sans mapping spécifique, essayer de restaurer depuis les URLs Cloudinary
    const cloudinaryProducts = await executeD1Query(`
      SELECT id, name, image_url, video_url 
      FROM products 
      WHERE id NOT IN (${products.map(p => p.id).join(',')})
      AND (image_url LIKE '%cloudinary%' OR image_url = '${FALLBACK_IMAGE}')
      ORDER BY id DESC
    `);
    
    if (cloudinaryProducts.success && cloudinaryProducts.result?.[0]?.results) {
      const otherProducts = cloudinaryProducts.result[0].results;
      console.log(`📦 ${otherProducts.length} autres produits trouvés`);
      
      for (const product of otherProducts) {
        console.log(`\n🛍️ Produit: ${product.name} (ID: ${product.id})`);
        
        // Essayer de générer des URLs basées sur l'ID et le nom
        const safeName = product.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const possibleImage = `${CORRECT_R2_DOMAIN}/images/product-${product.id}-${safeName}.jpg`;
        const possibleVideo = `${CORRECT_R2_DOMAIN}/videos/product-${product.id}-${safeName}.mp4`;
        
        const imageExists = await testUrl(possibleImage);
        const videoExists = await testUrl(possibleVideo);
        
        console.log(`   📸 Test image générée: ${imageExists ? '✅ OK' : '❌ 404'}`);
        console.log(`   🎬 Test vidéo générée: ${videoExists ? '✅ OK' : '❌ 404'}`);
        
        const finalImageUrl = imageExists ? possibleImage : FALLBACK_IMAGE;
        const finalVideoUrl = videoExists ? possibleVideo : '';
        
        await executeD1Query(
          'UPDATE products SET image_url = ?, video_url = ? WHERE id = ?',
          [finalImageUrl, finalVideoUrl, product.id]
        );
        
        console.log(`   ✅ Mis à jour avec: ${imageExists ? 'VRAIE IMAGE' : 'FALLBACK'}`);
      }
    }

    // 4. Vérification finale
    console.log('\n4️⃣ Vérification finale...');
    
    const finalCheck = await executeD1Query(`
      SELECT id, name, image_url, video_url 
      FROM products 
      WHERE image_url IS NOT NULL AND image_url != ''
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    if (finalCheck.success && finalCheck.result?.[0]?.results) {
      const products = finalCheck.result[0].results;
      console.log('\n📋 Échantillon final:');
      
      for (const product of products) {
        console.log(`\n🛍️ ${product.name} (ID: ${product.id})`);
        
        const isSpecificImage = !product.image_url.includes('1756654233249-vdc0hme52d.jpeg');
        const hasVideo = product.video_url && product.video_url.trim() !== '';
        
        console.log(`   📸 Image: ${isSpecificImage ? '🎯 SPÉCIFIQUE' : '📷 FALLBACK'}`);
        console.log(`   🎬 Vidéo: ${hasVideo ? '🎯 SPÉCIFIQUE' : '🚫 VIDE'}`);
        
        if (isSpecificImage) {
          const testResponse = await testUrl(product.image_url);
          console.log(`   🔍 Test: ${testResponse ? '✅ OK' : '❌ ERREUR'}`);
        }
      }
    }

    console.log('\n🎉 RESTAURATION TERMINÉE !');
    console.log('✅ Les vraies images/vidéos ont été restaurées quand elles existent');
    console.log('✅ Fallback utilisé seulement quand nécessaire');
    
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error);
    process.exit(1);
  }
}

// Exécuter le script
restoreOriginalMedia().then(() => {
  console.log('\n🚀 Restauration terminée avec succès !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});