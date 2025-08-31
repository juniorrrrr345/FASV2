#!/usr/bin/env node

/**
 * 👷 CRÉATION WORKER CLOUDFLARE POUR MÉDIAS
 * Crée un Worker pour servir publiquement les médias R2
 */

// Configuration Cloudflare
const CLOUDFLARE_CONFIG = {
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '7979421604bd07b3bd34d3ed96222512',
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW',
  R2_BUCKET: 'fas-media',
  WORKER_NAME: 'fas-media-worker'
};

// Script du Worker
const WORKER_SCRIPT = `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const objectKey = url.pathname.slice(1); // Enlever le / initial
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (!objectKey) {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
    
    try {
      const object = await env.FAS_MEDIA.get(objectKey);
      
      if (!object) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
      
      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');
      
      return new Response(object.body, { headers });
    } catch (error) {
      return new Response('Error: ' + error.message, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};`;

async function createWorker() {
  console.log('👷 CRÉATION WORKER CLOUDFLARE POUR MÉDIAS');
  console.log('='.repeat(50));
  
  try {
    // 1. Créer le Worker
    console.log(`📝 Création du Worker: ${CLOUDFLARE_CONFIG.WORKER_NAME}`);
    
    const workerResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_CONFIG.WORKER_NAME}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        'Content-Type': 'application/javascript'
      },
      body: WORKER_SCRIPT
    });
    
    const workerResult = await workerResponse.json();
    
    if (workerResponse.ok) {
      console.log('✅ Worker créé avec succès');
      console.log(`🔗 Worker URL: https://${CLOUDFLARE_CONFIG.WORKER_NAME}.${CLOUDFLARE_CONFIG.ACCOUNT_ID}.workers.dev`);
    } else {
      console.log('❌ Erreur création Worker:', workerResult);
    }
    
    // 2. Lier le bucket R2 au Worker
    console.log('\n🔗 Liaison du bucket R2 au Worker...');
    
    const bindingResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_CONFIG.WORKER_NAME}/bindings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          type: 'r2_bucket',
          name: 'FAS_MEDIA',
          bucket_name: CLOUDFLARE_CONFIG.R2_BUCKET
        }
      ])
    });
    
    const bindingResult = await bindingResponse.json();
    
    if (bindingResponse.ok) {
      console.log('✅ Bucket R2 lié au Worker');
    } else {
      console.log('❌ Erreur liaison bucket:', bindingResult);
    }
    
    // 3. Activer le Worker
    console.log('\n🚀 Activation du Worker...');
    
    const activateResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_CONFIG.WORKER_NAME}/subdomain`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: true
      })
    });
    
    const activateResult = await activateResponse.json();
    
    if (activateResponse.ok) {
      console.log('✅ Worker activé');
    } else {
      console.log('⚠️  Activation Worker:', activateResult);
    }
    
    // 4. URL finale du Worker
    const workerUrl = `https://${CLOUDFLARE_CONFIG.WORKER_NAME}.${CLOUDFLARE_CONFIG.ACCOUNT_ID}.workers.dev`;
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 WORKER CONFIGURÉ !');
    console.log(`🔗 URL du Worker: ${workerUrl}`);
    console.log('\n📋 URLs des médias:');
    console.log(`🖼️  Images: ${workerUrl}/products/images/[filename]`);
    console.log(`🎥 Vidéos: ${workerUrl}/products/videos/[filename]`);
    
    // 5. Exemples d'URLs
    console.log('\n🔗 Exemples d\'URLs de médias:');
    console.log(`${workerUrl}/products/images/68927c1295b9e27363750810_1756683832787.jpg`);
    console.log(`${workerUrl}/products/videos/68927c1295b9e27363750810_1756683833631.mp4`);
    
    return workerUrl;
    
  } catch (error) {
    console.error('❌ ERREUR CRÉATION WORKER:', error);
    return null;
  }
}

// Exécution
if (require.main === module) {
  createWorker().catch(console.error);
}

module.exports = { createWorker };