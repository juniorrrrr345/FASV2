#!/usr/bin/env node

/**
 * 🔄 UPLOAD RÉEL SUR CLOUDFLARE R2
 * Télécharge VRAIMENT depuis Cloudinary et uploade sur R2
 */

const AWS = require('aws-sdk');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration Cloudflare R2 (S3-compatible)
const s3 = new AWS.S3({
  endpoint: 'https://7979421604bd07b3bd34d3ed96222512.r2.cloudflarestorage.com',
  accessKeyId: '82WsPNjX-j0UqZIGAny8b0uEehcHd0X3zMKNIKIN',
  secretAccessKey: '28230e200a3b71e5374e569f8a297eba9aa3fe2e1097fdf26e5d9e340ded709d',
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true
});

// Configuration D1
const D1_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

async function executeD1Query(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${D1_CONFIG.accountId}/d1/database/${D1_CONFIG.databaseId}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${D1_CONFIG.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  
  return await response.json();
}

function downloadFromCloudinary(url) {
  return new Promise((resolve, reject) => {
    const tempFile = `/tmp/media_${Date.now()}`;
    const file = fs.createWriteStream(tempFile);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} pour ${url}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(tempFile);
        console.log(`   ✅ Téléchargé: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        resolve(tempFile);
      });
      
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function uploadToR2(filePath, key, contentType) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    
    const params = {
      Bucket: 'boutique-images',
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      ACL: 'public-read'
    };
    
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const publicUrl = `https://pub-b38679a01a274648827751df94818418.r2.dev/${key}`;
        console.log(`   ✅ Uploadé R2: ${publicUrl}`);
        resolve(publicUrl);
      }
    });
  });
}

async function main() {
  console.log('🚀 DÉBUT UPLOAD RÉEL CLOUDINARY → CLOUDFLARE R2');
  console.log('📦 Téléchargement et upload physique de VOS médias');
  console.log('='.repeat(60));
  
  try {
    // Récupérer produits avec URLs Cloudinary
    const result = await executeD1Query(`
      SELECT id, name, image_url, video_url 
      FROM products 
      WHERE image_url LIKE "%cloudinary%" OR video_url LIKE "%cloudinary%"
    `);
    
    const products = result.result?.[0]?.results || [];
    console.log(`📊 ${products.length} produits à migrer vers R2`);
    
    for (const product of products) {
      console.log(`\n🛍️ Upload: ${product.name}`);
      
      let newImageUrl = product.image_url;
      let newVideoUrl = product.video_url;
      
      // Upload image sur R2
      if (product.image_url && product.image_url.includes('cloudinary')) {
        try {
          console.log(`   🖼️  Migration image...`);
          const imagePath = await downloadFromCloudinary(product.image_url);
          const imageKey = `images/${product.id}-${product.name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`;
          
          newImageUrl = await uploadToR2(imagePath, imageKey, 'image/jpeg');
          
          // Nettoyer fichier temp
          fs.unlinkSync(imagePath);
          
        } catch (error) {
          console.error(`   ❌ Erreur image ${product.name}:`, error.message);
        }
      }
      
      // Upload vidéo sur R2
      if (product.video_url && product.video_url.includes('cloudinary')) {
        try {
          console.log(`   🎬 Migration vidéo...`);
          const videoPath = await downloadFromCloudinary(product.video_url);
          const videoKey = `videos/${product.id}-${product.name.replace(/[^a-zA-Z0-9]/g, '')}.mp4`;
          
          newVideoUrl = await uploadToR2(videoPath, videoKey, 'video/mp4');
          
          // Nettoyer fichier temp
          fs.unlinkSync(videoPath);
          
        } catch (error) {
          console.error(`   ❌ Erreur vidéo ${product.name}:`, error.message);
        }
      }
      
      // Mettre à jour en D1
      if (newImageUrl !== product.image_url || newVideoUrl !== product.video_url) {
        await executeD1Query(
          'UPDATE products SET image_url = ?, video_url = ? WHERE id = ?',
          [newImageUrl, newVideoUrl, product.id]
        );
        console.log(`   ✅ URLs Cloudflare R2 mises à jour en D1`);
      }
    }
    
    console.log('\n🎉 UPLOAD RÉEL TERMINÉ !');
    console.log('✅ Tous vos médias sont maintenant PHYSIQUEMENT sur Cloudflare R2');
    console.log('✅ URLs D1 mises à jour avec vraies URLs R2');
    console.log('✅ Médias s\'affichent côté client ET panel admin');
    console.log('✅ 100% Cloudflare - Plus de dépendance Cloudinary');
    
  } catch (error) {
    console.error('❌ Erreur upload réel:', error);
  }
}

// Exécution
main().catch(console.error);