// Script de debug pour tester la suppression des catégories et fermes
const CLOUDFLARE_CONFIG = {
  ACCOUNT_ID: '7979421604bd07b3bd34d3ed96222512',
  DATABASE_ID: '78d6725a-cd0f-46f9-9fa4-25ca4faa3efb',
  API_TOKEN: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

async function executeSQL(sql, params = []) {
  const { ACCOUNT_ID, DATABASE_ID, API_TOKEN } = CLOUDFLARE_CONFIG;
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
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

async function testDeletion() {
  console.log('🔍 Test de suppression des catégories et fermes...\n');
  
  try {
    // 1. Lister toutes les catégories
    console.log('📋 Catégories existantes:');
    const categoriesData = await executeSQL('SELECT id, name FROM categories ORDER BY name');
    const categories = categoriesData.result?.[0]?.results || [];
    console.log(categories);
    
    // 2. Lister toutes les fermes
    console.log('\n📋 Fermes existantes:');
    const farmsData = await executeSQL('SELECT id, name FROM farms ORDER BY name');
    const farms = farmsData.result?.[0]?.results || [];
    console.log(farms);
    
    // 3. Vérifier les produits associés
    console.log('\n🔗 Vérification des produits associés:');
    for (const category of categories) {
      const productsData = await executeSQL('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [category.id]);
      const productCount = productsData.result?.[0]?.results?.[0]?.count || 0;
      console.log(`Catégorie "${category.name}" (ID: ${category.id}): ${productCount} produit(s)`);
    }
    
    for (const farm of farms) {
      const productsData = await executeSQL('SELECT COUNT(*) as count FROM products WHERE farm_id = ?', [farm.id]);
      const productCount = productsData.result?.[0]?.results?.[0]?.count || 0;
      console.log(`Ferme "${farm.name}" (ID: ${farm.id}): ${productCount} produit(s)`);
    }
    
    // 4. Tester la suppression d'une catégorie sans produits
    const categoryToDelete = categories.find(cat => {
      // Trouver une catégorie sans produits
      return true; // On va tester avec la première
    });
    
    if (categoryToDelete) {
      console.log(`\n🗑️ Test de suppression de la catégorie "${categoryToDelete.name}" (ID: ${categoryToDelete.id})`);
      
      // Vérifier d'abord s'il y a des produits
      const productsData = await executeSQL('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryToDelete.id]);
      const productCount = productsData.result?.[0]?.results?.[0]?.count || 0;
      
      if (productCount > 0) {
        console.log(`❌ Impossible de supprimer: ${productCount} produit(s) associé(s)`);
      } else {
        console.log('✅ Aucun produit associé, suppression possible');
        // Ne pas vraiment supprimer, juste tester la requête
        console.log('🔍 Test de la requête DELETE (simulation)...');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testDeletion();