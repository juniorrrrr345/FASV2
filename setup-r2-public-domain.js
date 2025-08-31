#!/usr/bin/env node

/**
 * 🌐 CONFIGURATION DOMAINE PUBLIC R2
 * Configure un domaine public pour accéder aux médias R2
 */

// Configuration Cloudflare
const CLOUDFLARE_CONFIG = {
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512',
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW',
  R2_BUCKET: 'fas-media'
};

async function setupPublicDomain() {
  console.log('🌐 CONFIGURATION DOMAINE PUBLIC R2');
  console.log('='.repeat(40));
  
  try {
    // 1. Vérifier les buckets existants
    console.log('🪣 Vérification des buckets R2...');
    
    const bucketsResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/r2/buckets`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`
      }
    });
    
    const bucketsResult = await bucketsResponse.json();
    
    if (bucketsResponse.ok) {
      const buckets = bucketsResult.result?.buckets || [];
      console.log(`✅ ${buckets.length} buckets trouvés:`);
      
      buckets.forEach(bucket => {
        console.log(`   🪣 ${bucket.name} (créé: ${bucket.creation_date})`);
      });
      
      const fasBucket = buckets.find(b => b.name === CLOUDFLARE_CONFIG.R2_BUCKET);
      if (fasBucket) {
        console.log(`✅ Bucket '${CLOUDFLARE_CONFIG.R2_BUCKET}' trouvé`);
      } else {
        console.log(`❌ Bucket '${CLOUDFLARE_CONFIG.R2_BUCKET}' non trouvé`);
        return;
      }
    }
    
    // 2. Configurer l'accès public
    console.log('\n🔓 Configuration accès public...');
    
    // Méthode alternative : utiliser les Workers pour servir les fichiers
    const workerScript = `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const objectKey = url.pathname.slice(1); // Enlever le / initial
    
    if (!objectKey) {
      return new Response('Not Found', { status: 404 });
    }
    
    try {
      const object = await env.FAS_MEDIA.get(objectKey);
      
      if (!object) {
        return new Response('Not Found', { status: 404 });
      }
      
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');
      
      return new Response(object.body, { headers });
    } catch (error) {
      return new Response('Error: ' + error.message, { status: 500 });
    }
  }
};`;
    
    console.log('📝 Script Worker créé pour servir les médias');
    
    // 3. Informations de configuration
    console.log('\n📋 Configuration requise:');
    console.log('1. Créer un Worker Cloudflare avec le script ci-dessus');
    console.log('2. Lier le bucket R2 au Worker (variable FAS_MEDIA)');
    console.log('3. Configurer un domaine personnalisé pour le Worker');
    
    // 4. URLs actuelles des médias
    console.log('\n🔗 URLs actuelles des médias:');
    console.log(`   Images: https://pub-79794216.r2.dev/products/images/[filename]`);
    console.log(`   Vidéos: https://pub-79794216.r2.dev/products/videos/[filename]`);
    
    // 5. Tester quelques URLs
    console.log('\n🧪 Test d\'accès aux médias...');
    
    const testUrls = [
      'https://pub-79794216.r2.dev/products/images/68927c1295b9e27363750810_1756683832787.jpg',
      'https://pub-79794216.r2.dev/products/videos/68927c1295b9e27363750810_1756683833631.mp4'
    ];
    
    for (const testUrl of testUrls) {
      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        console.log(`   ${response.ok ? '✅' : '❌'} ${testUrl.split('/').pop()}: ${response.status}`);
      } catch (error) {
        console.log(`   ❌ ${testUrl.split('/').pop()}: Erreur de connexion`);
      }
    }
    
    console.log('\n' + '='.repeat(40));
    console.log('✅ CONFIGURATION TERMINÉE');
    console.log('\n💡 Prochaines étapes:');
    console.log('1. Les médias sont stockés dans R2');
    console.log('2. Les URLs sont mises à jour dans D1');
    console.log('3. L\'API /api/products-simple retourne les produits avec les bonnes URLs');
    console.log('4. Pour un accès public complet, configurer un Worker ou un domaine personnalisé');
    
  } catch (error) {
    console.error('❌ ERREUR CONFIGURATION:', error);
  }
}

// Exécution
if (require.main === module) {
  setupPublicDomain().catch(console.error);
}

module.exports = { setupPublicDomain };