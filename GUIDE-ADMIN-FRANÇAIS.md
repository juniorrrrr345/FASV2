# 🛍️ Guide d'Administration FAS - Panel Admin

## 📋 Vue d'ensemble

Votre panel d'administration FAS est maintenant **entièrement fonctionnel** avec toutes les fonctionnalités CRUD (Créer, Lire, Modifier, Supprimer) pour :
- ✅ **Produits** (création, modification, suppression)
- ✅ **Catégories** (création, modification, suppression)
- ✅ **Farms** (création, modification, suppression)
- ✅ **Réseaux sociaux** (création, modification, suppression)

## 🔧 Problèmes Résolus

### ❌ Erreur 405 "Method Not Allowed" - CORRIGÉE ✅

**Problème :** Quand vous tentiez de créer un produit, vous receviez une erreur 405.

**Cause :** Les routes API ne contenaient que les méthodes `GET` mais pas `POST`, `PUT`, `DELETE`.

**Solution :** J'ai ajouté toutes les méthodes HTTP manquantes :
- `POST` pour créer
- `PUT` pour modifier  
- `DELETE` pour supprimer

## 🎯 Fonctionnalités Disponibles

### 1. 🛍️ Gestion des Produits

#### ➕ Créer un Produit
1. Allez dans **Produits** → **➕ Ajouter un produit**
2. Remplissez les champs obligatoires :
   - **Nom** : Nom du produit
   - **Catégorie** : Sélectionnez ou créez une nouvelle catégorie
   - **Farm** : Sélectionnez ou créez une nouvelle farm
   - **Image** : URL obligatoire de l'image
3. Ajoutez les prix pour différentes quantités (3g, 5g, 10g, etc.)
4. Cliquez **💾 Sauvegarder**

#### ✏️ Modifier un Produit
1. Cliquez sur **✏️ Modifier** sur un produit existant
2. Modifiez les informations souhaitées
3. Cliquez **💾 Sauvegarder**

#### 🗑️ Supprimer un Produit
1. Cliquez sur **🗑️** à côté du produit
2. Confirmez la suppression

### 2. 🏷️ Gestion des Catégories

#### ➕ Créer une Catégorie
**Méthode 1 - Depuis le panel Catégories :**
1. Allez dans **Catégories** → **➕ Ajouter une catégorie**
2. Remplissez :
   - **Nom** : Nom de la catégorie
   - **Description** : Description optionnelle
   - **Icône** : Emoji ou icône (ex: 🌿, 💊, 🌺)
   - **Couleur** : Couleur de la catégorie
3. Cliquez **✅ Créer la catégorie**

**Méthode 2 - Création rapide depuis Produits :**
1. Dans le formulaire de produit, à côté de "Catégorie", cliquez **➕ Nouvelle**
2. Remplissez le formulaire rapide
3. La catégorie sera automatiquement sélectionnée

#### ✏️ Modifier une Catégorie
1. Dans **Catégories**, cliquez **✏️ Modifier**
2. Modifiez les informations
3. Cliquez **💾 Sauvegarder**

#### 🗑️ Supprimer une Catégorie
1. Cliquez **🗑️** à côté de la catégorie
2. ⚠️ **Attention :** Impossible si des produits utilisent cette catégorie

### 3. 🏭 Gestion des Farms

#### ➕ Créer une Farm
**Méthode 1 - Depuis le panel Farms :**
1. Allez dans **Farms** → **➕ Ajouter une farm**
2. Remplissez :
   - **Nom** : Nom de la farm
   - **Description** : Description optionnelle
   - **Localisation** : Lieu de la farm
   - **Contact** : Email ou téléphone
3. Cliquez **✅ Créer la farm**

**Méthode 2 - Création rapide depuis Produits :**
1. Dans le formulaire de produit, à côté de "Farm", cliquez **➕ Nouvelle**
2. Remplissez le formulaire rapide
3. La farm sera automatiquement sélectionnée

#### ✏️ Modifier une Farm
1. Dans **Farms**, cliquez **✏️ Modifier**
2. Modifiez les informations
3. Cliquez **💾 Sauvegarder**

#### 🗑️ Supprimer une Farm
1. Cliquez **🗑️** à côté de la farm
2. ⚠️ **Attention :** Impossible si des produits utilisent cette farm

### 4. 🌐 Gestion des Réseaux Sociaux

#### ➕ Ajouter un Réseau Social
1. Allez dans **Réseaux sociaux** → **➕ Ajouter un lien**
2. Remplissez :
   - **Nom** : Nom du réseau (ex: Instagram, TikTok)
   - **URL** : Lien vers votre profil
   - **Icône** : Emoji ou symbole
   - **Couleur** : Couleur du réseau social
3. Cliquez **💾 Sauvegarder**

#### ✏️ Modifier un Lien Social
1. Cliquez **✏️ Modifier** sur le lien
2. Modifiez les informations
3. Cliquez **💾 Sauvegarder**

#### 🗑️ Supprimer un Lien Social
1. Cliquez **🗑️** à côté du lien
2. Confirmez la suppression

## 🔗 Routes API Disponibles

### Produits
- `GET /api/products-simple` - Récupérer tous les produits
- `POST /api/products-simple` - Créer un produit
- `PUT /api/products-simple/[id]` - Modifier un produit
- `DELETE /api/products-simple/[id]` - Supprimer un produit

### Catégories
- `GET /api/categories-simple` - Récupérer toutes les catégories
- `POST /api/categories-simple` - Créer une catégorie
- `PUT /api/categories-simple/[id]` - Modifier une catégorie
- `DELETE /api/categories-simple/[id]` - Supprimer une catégorie

### Farms
- `GET /api/farms-simple` - Récupérer toutes les farms
- `POST /api/farms-simple` - Créer une farm
- `PUT /api/farms-simple/[id]` - Modifier une farm
- `DELETE /api/farms-simple/[id]` - Supprimer une farm

### Réseaux Sociaux
- `GET /api/social-simple` - Récupérer tous les liens sociaux
- `POST /api/social-simple` - Créer un lien social
- `PUT /api/social-simple/[id]` - Modifier un lien social
- `DELETE /api/social-simple/[id]` - Supprimer un lien social

## 🎯 Workflow Recommandé

### Pour Ajouter un Nouveau Produit :

1. **Préparez vos médias :**
   - Image du produit (obligatoire)
   - Vidéo du produit (optionnelle)
   - Uploadez sur Cloudflare R2 ou utilisez des URLs existantes

2. **Créez la catégorie (si nouvelle) :**
   - Soit depuis **Catégories** → **➕ Ajouter**
   - Soit directement depuis le formulaire produit avec **➕ Nouvelle**

3. **Créez la farm (si nouvelle) :**
   - Soit depuis **Farms** → **➕ Ajouter**
   - Soit directement depuis le formulaire produit avec **➕ Nouvelle**

4. **Créez le produit :**
   - **Produits** → **➕ Ajouter un produit**
   - Remplissez tous les champs obligatoires
   - Définissez les prix pour chaque quantité
   - Ajoutez des promotions si nécessaire
   - **💾 Sauvegarder**

## ⚠️ Points d'Attention

### Champs Obligatoires pour Produits :
- ✅ **Nom**
- ✅ **Catégorie** (doit exister)
- ✅ **Farm** (doit exister)
- ✅ **Image URL** (obligatoire)
- ✅ **Au moins un prix** défini

### Règles de Suppression :
- ❌ **Catégorie** : Impossible si des produits l'utilisent
- ❌ **Farm** : Impossible si des produits l'utilisent
- ✅ **Produit** : Toujours possible
- ✅ **Lien Social** : Toujours possible

### Format des Prix :
- Quantités supportées : `3g`, `5g`, `10g`, `25g`, `50g`, `100g`, `200g`, `500g`, `1kg`, etc.
- Prix en euros (ex: `25.50`)
- Promotions en pourcentage (ex: `15` pour 15% de réduction)

## 🚀 Utilisation

### Accès au Panel Admin :
1. Allez sur votre site → `/admin`
2. Connectez-vous avec vos identifiants
3. Naviguez entre les sections avec le menu latéral

### Navigation :
- **Desktop** : Menu latéral fixe
- **Mobile** : Menu hamburger en haut à gauche
- **Tablet** : Interface adaptée

## 🔍 Débogage

### Si vous rencontrez des problèmes :

1. **Vérifiez la console du navigateur** (F12)
2. **Vérifiez les logs du serveur** (terminal où tourne `npm run dev`)
3. **Testez les APIs** avec le script fourni :
   ```bash
   node test-admin-apis.js
   ```

### Messages d'Erreur Courants :

- **"Champs obligatoires manquants"** → Vérifiez que tous les champs requis sont remplis
- **"Catégorie ou farm introuvable"** → Créez d'abord la catégorie/farm
- **"Une catégorie avec ce nom existe déjà"** → Choisissez un nom différent
- **"Impossible de supprimer"** → Des produits utilisent encore cet élément

## 🎉 Félicitations !

Votre panel admin est maintenant **100% fonctionnel** avec :
- ✅ Création de produits sans erreur 405
- ✅ Gestion complète des catégories
- ✅ Gestion complète des farms
- ✅ Gestion des réseaux sociaux
- ✅ Fonctionnalités de modification et suppression
- ✅ Interface responsive (mobile/desktop)
- ✅ Création rapide depuis les formulaires
- ✅ Validation des données
- ✅ Messages d'erreur explicites

**Votre boutique FAS est prête pour la gestion de contenu !** 🚀