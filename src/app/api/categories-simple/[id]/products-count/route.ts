import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Configuration Cloudflare (même que dans les autres fichiers)
const getCloudflareConfig = () => ({
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || 'VOTRE_ACCOUNT_ID',
  DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID || 'VOTRE_DATABASE_ID',
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'VOTRE_API_TOKEN'
});

const executeSQL = async (sql: string, params: any[] = []) => {
  const { ACCOUNT_ID, DATABASE_ID, API_TOKEN } = getCloudflareConfig();
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const categoryId = params.id;
    const productsData = await executeSQL('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId]);
    const productCount = productsData.result?.[0]?.results?.[0]?.count || 0;
    
    return NextResponse.json({ count: productCount });
  } catch (error) {
    console.error('❌ Erreur comptage produits catégorie:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}