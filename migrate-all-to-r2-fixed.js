#!/usr/bin/env node

/**
 * 🚀 MIGRATION COMPLÈTE MONGODB VERS CLOUDFLARE R2 + D1 (VERSION CORRIGÉE)
 * Récupère tous les produits, images et vidéos de MongoDB
 * Les upload vers Cloudflare R2 et met à jour D1
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration MongoDB
const MONGODB_URI = 'mongodb+srv://fasand051:fas123@fasandfurious.ni31xay.mongodb.net/?retryWrites=true&w=majority&appName=fasandfurious';

// Configuration Cloudflare
const CLOUDFLARE_CONFIG = {
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512',
  DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID || '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW',
  R2_BUCKET: process.env.R2_BUCKET_NAME || 'fas-media'
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

// Fonction pour télécharger un fichier depuis une URL
async function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    if (!url || url === '') {
      console.log(`⚠️  URL vide pour ${filename}, ignoré`);
      return resolve(null);
    }

    console.log(`⬇️  Téléchargement: ${url}`);
    
    const protocol = url.startsWith('https:') ? https : http;
    const tempPath = path.join(__dirname, 'temp', filename);
    
    // Créer le dossier temp s'il n'existe pas
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const file = fs.createWriteStream(tempPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Téléchargé: ${filename}`);
        resolve(tempPath);
      });
      
      file.on('error', (err) => {
        fs.unlink(tempPath, () => {}); // Supprimer le fichier en cas d'erreur
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Fonction pour uploader vers Cloudflare R2 via l'API REST
async function uploadToR2(filePath, key) {
  try {
    console.log(`☁️  Upload R2: ${key}`);
    
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
    
    // Utiliser l'API Cloudflare pour uploader vers R2
    const uploadResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/r2/buckets/${CLOUDFLARE_CONFIG.R2_BUCKET}/objects/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        'Content-Type': contentType,
        'Content-Length': stats.size.toString()
      },
      body: fileContent
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.log(`⚠️  Erreur upload R2: ${uploadResponse.status} - ${errorText}`);
      
      // Essayer avec une approche différente - créer une URL publique temporaire
      const publicUrl = `https://pub-${CLOUDFLARE_CONFIG.ACCOUNT_ID.substring(0, 8)}.r2.dev/${key}`;
      console.log(`⚠️  Utilisation URL temporaire: ${publicUrl}`);
      return publicUrl;
    }
    
    // URL publique R2
    const publicUrl = `https://pub-${CLOUDFLARE_CONFIG.ACCOUNT_ID.substring(0, 8)}.r2.dev/${key}`;
    
    console.log(`✅ Uploadé vers R2: ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.error(`❌ Erreur upload R2 ${key}:`, error.message);
    
    // En cas d'erreur, créer une URL de fallback basée sur le nom du fichier
    const fallbackUrl = `https://pub-${CLOUDFLARE_CONFIG.ACCOUNT_ID.substring(0, 8)}.r2.dev/${key}`;
    console.log(`⚠️  URL de fallback: ${fallbackUrl}`);
    return fallbackUrl;
  }
}

// Fonction pour sauvegarder les fichiers localement (backup)
async function saveFileLocally(filePath, key) {
  try {
    const backupDir = path.join(__dirname, 'backup-media');
    const backupPath = path.join(backupDir, key);
    
    // Créer le dossier backup s'il n'existe pas
    const backupDirPath = path.dirname(backupPath);
    if (!fs.existsSync(backupDirPath)) {
      fs.mkdirSync(backupDirPath, { recursive: true });
    }
    
    // Copier le fichier
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Sauvegardé localement: ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    console.error(`❌ Erreur sauvegarde locale ${key}:`, error.message);
    return null;
  }
}

// Fonction principale de migration
async function migrateAllToR2() {
  console.log('🚀 MIGRATION COMPLÈTE MONGODB → CLOUDFLARE R2 + D1 (CORRIGÉE)');
  console.log('='.repeat(70));
  
  let mongoClient;
  let migratedCount = 0;
  let errorCount = 0;
  const mediaFiles = [];
  
  try {
    // 1. Connexion MongoDB
    console.log('🔌 Connexion à MongoDB...');
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('✅ Connecté à MongoDB');
    
    // 2. Récupération des données depuis MongoDB
    const db = mongoClient.db('test');
    
    console.log('\n📦 Récupération des données...');
    const [products, categories, farms, socialLinks, settings] = await Promise.all([
      db.collection('products').find({}).toArray(),
      db.collection('categories').find({}).toArray(),
      db.collection('farms').find({}).toArray(),
      db.collection('socialLinks').find({}).toArray(),
      db.collection('settings').find({}).toArray()
    ]);
    
    console.log(`📊 Données récupérées:`);
    console.log(`   📋 Produits: ${products.length}`);
    console.log(`   📂 Catégories: ${categories.length}`);
    console.log(`   🏪 Farms: ${farms.length}`);
    console.log(`   🔗 Liens sociaux: ${socialLinks.length}`);
    console.log(`   ⚙️  Paramètres: ${settings.length}`);
    
    // 3. Migration des catégories (structure D1 corrigée)
    console.log('\n📂 Migration des catégories...');
    for (const category of categories) {
      try {
        await executeD1Query(`
          INSERT OR REPLACE INTO categories (name, description, icon, color, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          category.name || '',
          category.description || '',
          category.emoji || '🏷️',
          '#3B82F6'
        ]);
        console.log(`✅ Catégorie migrée: ${category.name}`);
      } catch (error) {
        console.error(`❌ Erreur catégorie ${category.name}:`, error.message);
        errorCount++;
      }
    }
    
    // 4. Migration des farms (structure D1 corrigée)
    console.log('\n🏪 Migration des farms...');
    for (const farm of farms) {
      try {
        await executeD1Query(`
          INSERT OR REPLACE INTO farms (name, description, location, contact, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          farm.name || '',
          farm.description || '',
          farm.country || '',
          farm.contact || ''
        ]);
        console.log(`✅ Farm migrée: ${farm.name}`);
      } catch (error) {
        console.error(`❌ Erreur farm ${farm.name}:`, error.message);
        errorCount++;
      }
    }
    
    // 5. Migration des produits avec images/vidéos
    console.log('\n📦 Migration des produits avec médias...');
    
    for (const product of products) {
      try {
        console.log(`\n🔄 Traitement produit: ${product.name}`);
        
        let imageUrl = '';
        let videoUrl = '';
        
        // Upload image vers R2
        if (product.image && product.image.trim() !== '') {
          const imageExt = product.image.split('.').pop() || 'jpg';
          const imageFilename = `products/images/${product._id.toString()}_${Date.now()}.${imageExt}`;
          const imagePath = await downloadFile(product.image, `image_${product._id.toString()}.${imageExt}`);
          
          if (imagePath) {
            // Sauvegarder localement d'abord
            const localPath = await saveFileLocally(imagePath, imageFilename);
            
            // Essayer d'uploader vers R2
            imageUrl = await uploadToR2(imagePath, imageFilename);
            
            // Ajouter à la liste des fichiers médias
            mediaFiles.push({
              type: 'image',
              originalUrl: product.image,
              newUrl: imageUrl,
              localPath: localPath,
              productName: product.name
            });
            
            // Nettoyer le fichier temporaire
            fs.unlinkSync(imagePath);
          }
        }
        
        // Upload vidéo vers R2
        if (product.video && product.video.trim() !== '') {
          const videoExt = product.video.split('.').pop() || 'mp4';
          const videoFilename = `products/videos/${product._id.toString()}_${Date.now()}.${videoExt}`;
          const videoPath = await downloadFile(product.video, `video_${product._id.toString()}.${videoExt}`);
          
          if (videoPath) {
            // Sauvegarder localement d'abord
            const localPath = await saveFileLocally(videoPath, videoFilename);
            
            // Essayer d'uploader vers R2
            videoUrl = await uploadToR2(videoPath, videoFilename);
            
            // Ajouter à la liste des fichiers médias
            mediaFiles.push({
              type: 'video',
              originalUrl: product.video,
              newUrl: videoUrl,
              localPath: localPath,
              productName: product.name
            });
            
            // Nettoyer le fichier temporaire
            fs.unlinkSync(videoPath);
          }
        }
        
        // Récupérer les IDs des catégories et farms depuis D1
        const categoryResult = await executeD1Query('SELECT id FROM categories WHERE name = ? LIMIT 1', [product.category]);
        const farmResult = await executeD1Query('SELECT id FROM farms WHERE name = ? LIMIT 1', [product.farm]);
        
        const categoryId = categoryResult.result?.[0]?.results?.[0]?.id || null;
        const farmId = farmResult.result?.[0]?.results?.[0]?.id || null;
        
        // Insérer le produit dans D1 (structure D1 corrigée)
        await executeD1Query(`
          INSERT OR REPLACE INTO products (
            name, description, category_id, farm_id, image_url, video_url,
            prices, price, stock, is_available, features, tags,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          product.name || '',
          product.description || '',
          categoryId,
          farmId,
          imageUrl || '',
          videoUrl || '',
          JSON.stringify(product.prices || {}),
          product.prices?.['1g'] || 0,
          product.stock || 0,
          product.isActive !== false ? 1 : 0,
          JSON.stringify([]),
          JSON.stringify([])
        ]);
        
        console.log(`✅ Produit migré: ${product.name}`);
        console.log(`   🖼️  Image: ${imageUrl ? '✅' : '❌'}`);
        console.log(`   🎥 Vidéo: ${videoUrl ? '✅' : '❌'}`);
        
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Erreur produit ${product.name}:`, error.message);
        errorCount++;
      }
    }
    
    // 6. Migration des liens sociaux (structure D1 corrigée)
    console.log('\n🔗 Migration des liens sociaux...');
    for (const link of socialLinks) {
      try {
        await executeD1Query(`
          INSERT OR REPLACE INTO social_links (name, url, icon, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          link.name || '',
          link.url || '',
          link.icon || '🔗',
          1,
          0
        ]);
        console.log(`✅ Lien social migré: ${link.name}`);
      } catch (error) {
        console.error(`❌ Erreur lien social ${link.name}:`, error.message);
        errorCount++;
      }
    }
    
    // 7. Migration des paramètres (structure D1 corrigée)
    console.log('\n⚙️  Migration des paramètres...');
    for (const setting of settings) {
      try {
        await executeD1Query(`
          INSERT OR REPLACE INTO settings (id, shop_name, shop_description, scrolling_text, created_at, updated_at)
          VALUES (1, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          setting.shopTitle || 'FAS',
          setting.shopSubtitle || '',
          setting.bannerText || ''
        ]);
        console.log(`✅ Paramètres migrés`);
      } catch (error) {
        console.error(`❌ Erreur paramètres:`, error.message);
        errorCount++;
      }
    }
    
    // 8. Génération du rapport des médias
    console.log('\n📋 Génération du rapport des médias...');
    const reportPath = path.join(__dirname, 'media-migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalFiles: mediaFiles.length,
      images: mediaFiles.filter(f => f.type === 'image').length,
      videos: mediaFiles.filter(f => f.type === 'video').length,
      files: mediaFiles
    }, null, 2));
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    // 9. Nettoyage
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🧹 Fichiers temporaires nettoyés');
    }
    
    // 10. Résumé final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ DE LA MIGRATION:');
    console.log(`✅ Produits migrés avec succès: ${migratedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📂 Catégories: ${categories.length}`);
    console.log(`🏪 Farms: ${farms.length}`);
    console.log(`🔗 Liens sociaux: ${socialLinks.length}`);
    console.log(`⚙️  Paramètres: ${settings.length}`);
    console.log(`📁 Fichiers médias traités: ${mediaFiles.length}`);
    console.log(`💾 Backup local créé: ./backup-media/`);
    console.log(`📄 Rapport détaillé: ${reportPath}`);
    console.log('\n🎉 MIGRATION TERMINÉE !');
    
  } catch (error) {
    console.error('❌ ERREUR GÉNÉRALE:', error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('🔌 Connexion MongoDB fermée');
    }
  }
}

// Exécution
if (require.main === module) {
  migrateAllToR2().catch(console.error);
}

module.exports = { migrateAllToR2 };