#!/usr/bin/env node

// Script pour lister les fichiers qui existent vraiment sur Cloudflare R2

const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW',
  bucketName: 'boutique-images'
};

const CORRECT_R2_DOMAIN = 'https://pub-b38679a01a274648827751df94818418.r2.dev';

async function listR2Files(prefix = '') {
  try {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/r2/buckets/${CLOUDFLARE_CONFIG.bucketName}/objects`);
    if (prefix) {
      url.searchParams.set('prefix', prefix);
    }
    url.searchParams.set('per_page', '1000'); // Augmenter la limite

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`List failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.objects?.map((obj) => obj.key) || [];
  } catch (error) {
    console.error('R2 List Error:', error);
    return [];
  }
}

async function checkR2Files() {
  console.log('🔍 Vérification des fichiers sur Cloudflare R2...\n');

  try {
    // 1. Lister tous les fichiers
    console.log('1️⃣ Liste de tous les fichiers...');
    const allFiles = await listR2Files();
    console.log(`📁 Total fichiers: ${allFiles.length}`);
    
    if (allFiles.length === 0) {
      console.log('❌ AUCUN FICHIER TROUVÉ sur R2 !');
      console.log('🔍 Le bucket est vide ou les permissions sont incorrectes');
      return;
    }

    // 2. Lister les images
    console.log('\n2️⃣ Liste des images...');
    const imageFiles = await listR2Files('images/');
    console.log(`🖼️ Images trouvées: ${imageFiles.length}`);
    
    if (imageFiles.length > 0) {
      console.log('\n📸 Premières images:');
      imageFiles.slice(0, 10).forEach(file => {
        console.log(`   • ${file}`);
        console.log(`   📍 URL: ${CORRECT_R2_DOMAIN}/${file}`);
      });
    }

    // 3. Lister les vidéos
    console.log('\n3️⃣ Liste des vidéos...');
    const videoFiles = await listR2Files('videos/');
    console.log(`🎬 Vidéos trouvées: ${videoFiles.length}`);
    
    if (videoFiles.length > 0) {
      console.log('\n🎬 Premières vidéos:');
      videoFiles.slice(0, 10).forEach(file => {
        console.log(`   • ${file}`);
        console.log(`   📍 URL: ${CORRECT_R2_DOMAIN}/${file}`);
      });
    }

    // 4. Lister les autres dossiers
    console.log('\n4️⃣ Structure du bucket...');
    const folders = [...new Set(allFiles.map(file => file.split('/')[0]))];
    console.log('📁 Dossiers trouvés:', folders);

    // 5. Test de quelques URLs
    console.log('\n5️⃣ Test d\'accès aux fichiers...');
    const testFiles = allFiles.slice(0, 5);
    
    for (const file of testFiles) {
      const url = `${CORRECT_R2_DOMAIN}/${file}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        console.log(`   ${response.ok ? '✅' : '❌'} ${file} (${response.status})`);
      } catch (e) {
        console.log(`   ❌ ${file} (ERREUR: ${e.message})`);
      }
    }

    console.log('\n📊 RÉSUMÉ:');
    console.log(`   📁 Total fichiers: ${allFiles.length}`);
    console.log(`   🖼️ Images: ${imageFiles.length}`);
    console.log(`   🎬 Vidéos: ${videoFiles.length}`);
    console.log(`   🌐 Domaine R2: ${CORRECT_R2_DOMAIN}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  }
}

// Exécuter le script
checkR2Files().then(() => {
  console.log('\n🚀 Vérification terminée !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});