#!/usr/bin/env node

// Script pour débugger l'erreur 500 lors de la modification

const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

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
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

async function debugUpdateError() {
  console.log('🔍 Debug de l\'erreur 500...\n');

  try {
    // 1. Vérifier la structure de la table products
    console.log('1️⃣ Structure de la table products...');
    
    const tableInfo = await executeD1Query(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='products'
    `);
    
    if (tableInfo.success && tableInfo.result?.[0]?.results?.[0]) {
      console.log('📊 Structure table products:');
      console.log(tableInfo.result[0].results[0].sql);
    }

    // 2. Vérifier le produit ID 31
    console.log('\n2️⃣ Vérification du produit ID 31...');
    
    const product = await executeD1Query('SELECT * FROM products WHERE id = 31');
    
    if (product.success && product.result?.[0]?.results?.[0]) {
      const prod = product.result[0].results[0];
      console.log('📦 Produit trouvé:');
      console.log(`   ID: ${prod.id}`);
      console.log(`   Nom: ${prod.name}`);
      console.log(`   Category ID: ${prod.category_id}`);
      console.log(`   Farm ID: ${prod.farm_id}`);
      console.log(`   Image: ${prod.image_url}`);
      console.log(`   Video: ${prod.video_url}`);
    } else {
      console.log('❌ Produit ID 31 non trouvé !');
    }

    // 3. Vérifier les catégories et farms
    console.log('\n3️⃣ Vérification des catégories...');
    const categories = await executeD1Query('SELECT id, name FROM categories WHERE name = ?', ['Hash 🍫']);
    console.log('📂 Catégorie "Hash 🍫":', categories.result?.[0]?.results);

    console.log('\n4️⃣ Vérification des farms...');
    const farms = await executeD1Query('SELECT id, name FROM farms WHERE name = ?', ['MOUSSEUX PREMIUM 🧽']);
    console.log('🏭 Farm "MOUSSEUX PREMIUM 🧽":', farms.result?.[0]?.results);

    // 5. Tester une mise à jour simple
    console.log('\n5️⃣ Test de mise à jour simple...');
    
    try {
      const updateResult = await executeD1Query(`
        UPDATE products 
        SET name = ?, updated_at = datetime('now')
        WHERE id = 31
      `, ['MOUSSEUX TEST SIMPLE']);
      
      console.log('✅ Mise à jour simple réussie:', updateResult.success);
      
    } catch (updateError) {
      console.log('❌ Erreur mise à jour simple:', updateError.message);
    }

    // 6. Tester avec tous les champs
    console.log('\n6️⃣ Test avec tous les champs...');
    
    try {
      const fullUpdateResult = await executeD1Query(`
        UPDATE products SET
          name = ?, description = ?, category_id = ?, farm_id = ?, 
          image_url = ?, video_url = ?, prices = ?, price = ?, 
          stock = ?, is_available = ?, features = ?, tags = ?, 
          updated_at = datetime('now')
        WHERE id = ?
      `, [
        'MOUSSEUX TEST COMPLET',
        'Test description',
        32, // ID Hash 🍫
        32, // ID MOUSSEUX PREMIUM 🧽
        'https://pub-b38679a01a274648827751df94818418.r2.dev/images/68927c1295b9e27363750810-mousseux.jpg',
        'https://pub-b38679a01a274648827751df94818418.r2.dev/videos/68927c1295b9e27363750810-mousseux.mp4',
        '{"10g":40,"25g":90}',
        40,
        0,
        1,
        '[]',
        '[]',
        31
      ]);
      
      console.log('✅ Mise à jour complète réussie:', fullUpdateResult.success);
      
    } catch (fullUpdateError) {
      console.log('❌ Erreur mise à jour complète:', fullUpdateError.message);
    }

    console.log('\n🎉 DEBUG TERMINÉ !');
    
  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
    process.exit(1);
  }
}

// Exécuter le script
debugUpdateError().then(() => {
  console.log('\n🚀 Debug terminé !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});