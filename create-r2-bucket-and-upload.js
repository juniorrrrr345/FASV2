#!/usr/bin/env node

/**
 * 🪣 CRÉATION DU BUCKET R2 ET UPLOAD DE TOUS LES MÉDIAS
 * Crée le bucket fas-media et upload tous les fichiers depuis backup-media
 */

const fs = require('fs');
const path = require('path');

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

// Fonction pour créer le bucket R2
async function createR2Bucket() {
  try {
    console.log(`🪣 Création du bucket R2: ${CLOUDFLARE_CONFIG.R2_BUCKET}`);
    
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/r2/buckets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: CLOUDFLARE_CONFIG.R2_BUCKET,
        location: 'auto'
      })
    });
    
    const result = await response.json();
    
    if (response.ok || result.errors?.[0]?.code === 10014) { // 10014 = bucket already exists
      console.log(`✅ Bucket R2 '${CLOUDFLARE_CONFIG.R2_BUCKET}' prêt`);
      return true;
    } else {
      console.error('❌ Erreur création bucket:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur création bucket R2:', error);
    return false;
  }
}

// Fonction pour uploader un fichier vers R2
async function uploadFileToR2(filePath, key) {
  try {
    console.log(`☁️  Upload: ${key}`);
    
    const fileContent = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);
    
    // Déterminer le Content-Type
    const ext = path.extname(key).toLowerCase();
    let contentType = 'application/octet-stream';
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo'
    };
    
    if (mimeTypes[ext]) {
      contentType = mimeTypes[ext];
    }
    
    // Upload vers R2
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/r2/buckets/${CLOUDFLARE_CONFIG.R2_BUCKET}/objects/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        'Content-Type': contentType,
        'Content-Length': stats.size.toString()
      },
      body: fileContent
    });
    
    if (response.ok) {
      const publicUrl = `https://pub-${CLOUDFLARE_CONFIG.ACCOUNT_ID.substring(0, 8)}.r2.dev/${key}`;
      console.log(`✅ Uploadé: ${publicUrl}`);
      return publicUrl;
    } else {
      const errorText = await response.text();
      console.error(`❌ Erreur upload ${key}:`, errorText);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Erreur upload ${key}:`, error);
    return null;
  }
}

// Fonction pour parcourir et uploader tous les fichiers
async function uploadAllMedia() {
  const backupDir = path.join(__dirname, 'backup-media');
  const uploadedFiles = [];
  
  if (!fs.existsSync(backupDir)) {
    console.log('❌ Dossier backup-media introuvable');
    return [];
  }
  
  // Fonction récursive pour parcourir les dossiers
  function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }
  
  const allFiles = getAllFiles(backupDir);
  console.log(`📁 ${allFiles.length} fichiers trouvés dans backup-media`);
  
  for (const filePath of allFiles) {
    const relativePath = path.relative(backupDir, filePath);
    const r2Key = relativePath.replace(/\\/g, '/'); // Normaliser les chemins Windows
    
    const publicUrl = await uploadFileToR2(filePath, r2Key);
    if (publicUrl) {
      uploadedFiles.push({
        localPath: filePath,
        r2Key: r2Key,
        publicUrl: publicUrl
      });
    }
  }
  
  return uploadedFiles;
}

// Fonction pour mettre à jour les URLs dans D1
async function updateUrlsInD1(uploadedFiles) {
  console.log('\n🔄 Mise à jour des URLs dans D1...');
  
  // Créer un mapping des anciens vers nouveaux chemins
  const urlMapping = {};
  
  for (const file of uploadedFiles) {
    // Extraire l'ID du produit depuis le nom de fichier
    const filename = path.basename(file.localPath);
    const productIdMatch = filename.match(/^[a-f0-9]{24}/);
    
    if (productIdMatch) {
      const productId = productIdMatch[0];
      
      if (file.r2Key.includes('images/')) {
        urlMapping[`image_${productId}`] = file.publicUrl;
      } else if (file.r2Key.includes('videos/')) {
        urlMapping[`video_${productId}`] = file.publicUrl;
      }
    }
  }
  
  console.log(`🔗 ${Object.keys(urlMapping).length} URLs à mettre à jour`);
  
  // Mettre à jour chaque produit
  let updateCount = 0;
  for (const [key, newUrl] of Object.entries(urlMapping)) {
    try {
      const [type, productId] = key.split('_');
      const column = type === 'image' ? 'image_url' : 'video_url';
      
      const result = await executeD1Query(`
        UPDATE products SET ${column} = ?, updated_at = datetime('now')
        WHERE name LIKE '%' || ? || '%' OR id = ?
      `, [newUrl, productId.substring(0, 8), parseInt(productId.substring(0, 8), 16) || 0]);
      
      if (result.success) {
        console.log(`✅ URL mise à jour: ${type} pour produit ${productId.substring(0, 8)}`);
        updateCount++;
      }
    } catch (error) {
      console.error(`❌ Erreur mise à jour URL ${key}:`, error.message);
    }
  }
  
  console.log(`✅ ${updateCount} URLs mises à jour dans D1`);
  return updateCount;
}

// Fonction principale
async function createBucketAndUpload() {
  console.log('🚀 CRÉATION BUCKET R2 ET UPLOAD COMPLET');
  console.log('='.repeat(50));
  
  try {
    // 1. Créer le bucket R2
    const bucketCreated = await createR2Bucket();
    if (!bucketCreated) {
      console.log('❌ Impossible de créer le bucket R2');
      return;
    }
    
    // 2. Uploader tous les médias
    console.log('\n📤 Upload de tous les médias vers R2...');
    const uploadedFiles = await uploadAllMedia();
    
    if (uploadedFiles.length === 0) {
      console.log('❌ Aucun fichier uploadé');
      return;
    }
    
    console.log(`✅ ${uploadedFiles.length} fichiers uploadés vers R2`);
    
    // 3. Mettre à jour les URLs dans D1
    const updatedUrls = await updateUrlsInD1(uploadedFiles);
    
    // 4. Générer le rapport final
    const finalReport = {
      timestamp: new Date().toISOString(),
      bucketName: CLOUDFLARE_CONFIG.R2_BUCKET,
      totalUploaded: uploadedFiles.length,
      urlsUpdated: updatedUrls,
      files: uploadedFiles
    };
    
    fs.writeFileSync('r2-upload-report.json', JSON.stringify(finalReport, null, 2));
    
    // 5. Résumé final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ FINAL:');
    console.log(`🪣 Bucket R2: ${CLOUDFLARE_CONFIG.R2_BUCKET} ✅`);
    console.log(`📤 Fichiers uploadés: ${uploadedFiles.length}`);
    console.log(`🔗 URLs mises à jour: ${updatedUrls}`);
    console.log(`📄 Rapport: r2-upload-report.json`);
    console.log('\n🎉 CRÉATION ET UPLOAD R2 TERMINÉS !');
    
    // Afficher quelques URLs d'exemple
    console.log('\n🔗 Exemples d\'URLs R2:');
    uploadedFiles.slice(0, 5).forEach(file => {
      console.log(`   ${file.publicUrl}`);
    });
    
  } catch (error) {
    console.error('❌ ERREUR GÉNÉRALE:', error);
  }
}

// Exécution
if (require.main === module) {
  createBucketAndUpload().catch(console.error);
}

module.exports = { createBucketAndUpload };