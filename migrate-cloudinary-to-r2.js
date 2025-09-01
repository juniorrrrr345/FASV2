#!/usr/bin/env node

// Script pour migrer les images/vidéos depuis Cloudinary vers Cloudflare R2

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW',
  r2AccessKey: '82WsPNjX-j0UqZIGAny8b0uEehcHd0X3zMKNIKIN',
  r2SecretKey: '28230e200a3b71e5374e569f8a297eba9aa3fe2e1097fdf26e5d9e340ded709d',
  bucketName: 'boutique-images'
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

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(filePath);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
      
      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Supprimer le fichier en cas d'erreur
        reject(err);
      });
    }).on('error', reject);
  });
}

async function uploadToR2(filePath, key, contentType) {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/r2/buckets/${CLOUDFLARE_CONFIG.bucketName}/objects/${key}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
          'Content-Type': contentType,
        },
        body: fileContent,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return `${CORRECT_R2_DOMAIN}/${key}`;
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
}

async function migrateCloudinaryToR2() {
  console.log('🚀 Migration Cloudinary → Cloudflare R2...\n');

  try {
    // 1. Récupérer tous les produits avec URLs Cloudinary
    console.log('1️⃣ Récupération des produits avec URLs Cloudinary...');
    
    const result = await executeD1Query(`
      SELECT id, name, image_url, video_url 
      FROM products 
      WHERE image_url LIKE '%cloudinary%' OR video_url LIKE '%cloudinary%'
      ORDER BY id DESC
    `);
    
    if (!result.success || !result.result?.[0]?.results) {
      console.log('❌ Aucun produit avec URLs Cloudinary trouvé');
      return;
    }
    
    const products = result.result[0].results;
    console.log(`📦 ${products.length} produits à migrer`);

    // 2. Créer le dossier temporaire
    const tempDir = './temp_media';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 3. Migrer chaque produit
    for (const product of products) {
      console.log(`\n🛍️ Migration: ${product.name} (ID: ${product.id})`);
      
      let newImageUrl = product.image_url;
      let newVideoUrl = product.video_url;
      
      // Migrer l'image
      if (product.image_url && product.image_url.includes('cloudinary')) {
        try {
          console.log('   📸 Téléchargement image depuis Cloudinary...');
          const imagePath = path.join(tempDir, `product-${product.id}-image.jpg`);
          await downloadFile(product.image_url, imagePath);
          
          console.log('   📤 Upload image vers R2...');
          const imageKey = `images/product-${product.id}-${product.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.jpg`;
          newImageUrl = await uploadToR2(imagePath, imageKey, 'image/jpeg');
          
          console.log(`   ✅ Image migrée: ${imageKey}`);
          fs.unlinkSync(imagePath); // Nettoyer
          
        } catch (error) {
          console.log(`   ❌ Erreur migration image: ${error.message}`);
          console.log(`   🔄 Conservation URL Cloudinary`);
        }
      }
      
      // Migrer la vidéo
      if (product.video_url && product.video_url.includes('cloudinary')) {
        try {
          console.log('   🎬 Téléchargement vidéo depuis Cloudinary...');
          const videoPath = path.join(tempDir, `product-${product.id}-video.mp4`);
          await downloadFile(product.video_url, videoPath);
          
          console.log('   📤 Upload vidéo vers R2...');
          const videoKey = `videos/product-${product.id}-${product.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.mp4`;
          newVideoUrl = await uploadToR2(videoPath, videoKey, 'video/mp4');
          
          console.log(`   ✅ Vidéo migrée: ${videoKey}`);
          fs.unlinkSync(videoPath); // Nettoyer
          
        } catch (error) {
          console.log(`   ❌ Erreur migration vidéo: ${error.message}`);
          console.log(`   🔄 Conservation URL Cloudinary`);
        }
      }
      
      // Mettre à jour en base seulement si migration réussie
      if (newImageUrl !== product.image_url || newVideoUrl !== product.video_url) {
        await executeD1Query(
          'UPDATE products SET image_url = ?, video_url = ? WHERE id = ?',
          [newImageUrl, newVideoUrl, product.id]
        );
        console.log(`   💾 Base de données mise à jour`);
      }
    }

    // 4. Nettoyer
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log('\n🎉 MIGRATION TERMINÉE !');
    console.log('✅ Les images/vidéos Cloudinary ont été migrées vers R2');
    console.log('✅ Chaque produit garde ses vraies images spécifiques');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

// Exécuter le script
migrateCloudinaryToR2().then(() => {
  console.log('\n🚀 Migration terminée avec succès !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});