'use client';
import { useState } from 'react';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'category' | 'farm';
  onSuccess: (name: string) => void;
}

export default function QuickCreateModal({ isOpen, onClose, type, onSuccess }: QuickCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '', // Pour les farms
    contact: '', // Pour les farms
    icon: '📦', // Pour les catégories
    color: '#3B82F6' // Pour les catégories
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert(`Le nom ${type === 'category' ? 'de la catégorie' : 'de la farm'} est obligatoire`);
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = type === 'category' ? '/api/categories-simple' : '/api/farms-simple';
      const payload = type === 'category' 
        ? {
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            color: formData.color
          }
        : {
            name: formData.name,
            description: formData.description,
            location: formData.location,
            contact: formData.contact
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Message de succès
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[9999]';
        successMsg.textContent = `✅ ${type === 'category' ? 'Catégorie' : 'Farm'} "${formData.name}" créée avec succès!`;
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
        
        // Réinitialiser le formulaire
        setFormData({
          name: '',
          description: '',
          location: '',
          contact: '',
          icon: '📦',
          color: '#3B82F6'
        });
        
        onSuccess(formData.name);
        onClose();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || 'Erreur lors de la création'}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[99999]">
      <div className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-md backdrop-blur-sm">
        <div className="p-6 border-b border-white/20">
          <h2 className="text-xl font-bold text-white">
            {type === 'category' ? '🏷️ Nouvelle Catégorie' : '🏭 Nouvelle Farm'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom {type === 'category' ? 'de la catégorie' : 'de la farm'} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-800 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder={type === 'category' ? 'Ex: Fleurs CBD' : 'Ex: Green Farm'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-gray-800 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50 h-20"
              placeholder="Description optionnelle..."
            />
          </div>

          {type === 'category' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Icône</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="📦 🌿 🍃 💊 🌺"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Couleur</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/20 rounded-lg h-12 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </>
          )}

          {type === 'farm' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Localisation</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Ex: Île-de-France, France"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contact</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="email@exemple.com ou +33 1 23 45 67 89"
                />
              </div>
            </>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 ${loading ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-3 px-6 rounded-lg transition-all duration-300`}
            >
              {loading ? '⏳ Création...' : `✅ Créer ${type === 'category' ? 'la catégorie' : 'la farm'}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
            >
              ❌ Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}