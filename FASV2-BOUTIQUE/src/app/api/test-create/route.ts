import { NextResponse } from 'next/server';
import d1Client from '../../../lib/cloudflare-d1';

export async function GET() {
  try {
    console.log('🧪 Test API désactivé - Données FAS propres');
    
    // API désactivée pour éviter les données de test
    return NextResponse.json({
      success: true,
      message: 'API test désactivée - Données FAS propres',
      note: 'Plus de création automatique de données de test'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'API test désactivée'
    }, { status: 200 });
  }
}