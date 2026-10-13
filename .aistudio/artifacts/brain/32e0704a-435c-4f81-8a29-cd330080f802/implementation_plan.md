# Plan : Utilisation sur Téléphone Android & Export Local de Marius Voice AI

## Objectif
Permettre d'utiliser Marius Voice AI directement sur votre smartphone Android comme une véritable application installée (PWA sans passer par le Play Store), tout en vous fournissant les instructions complètes pour exporter et exécuter le code en local sur votre ordinateur.

---

## 1. Utilisation Directe sur Téléphone Android (Chrome)

### Votre Lien d'Accès Mobile
Vous pouvez ouvrir l'application directement depuis votre téléphone à l'adresse partagée :
👉 **`https://ais-pre-wlk23xqbdtofzpfpgxw43l-635059243381.us-east1.run.app`**

### Comment l'installer sur Android en 3 étapes :
1. **Ouvrir le lien** dans le navigateur **Google Chrome** sur votre smartphone Android.
2. Appuyer sur le menu à **3 points verticaux** (en haut à droite de Chrome).
3. Sélectionner **« Ajouter à l'écran d'accueil »** ou **« Installer l'application »**.
4. Valider : une icône **Marius Voice AI** apparaîtra sur votre écran d'accueil et s'ouvrira en plein écran (sans barre d'adresse de navigateur), exactement comme une application native.

---

## 2. Améliorations PWA dans l'Application

Pour rendre l'installation immédiate et fluide sur votre téléphone :
1. **Ajout d'un Web App Manifest (`manifest.json`)** :
   - Nom complet : *Marius Voice AI*
   - Affichage : `standalone` (plein écran sans barre d'adresse)
   - Thème sombre et icône studio violette/indigo
2. **Bouton d'Installation Mobile Intégré** :
   - Un bouton d'action directe *"Installer sur mon téléphone"* dans le menu Paramètres et la barre supérieure lorsqu'on visite le site depuis un smartphone.
   - Boîte de dialogue guidée avec captures visuelles pour Android Chrome.

---

## 3. Guide d'Exportation pour Utilisation en Local (Ordinateur)

Si vous souhaitez exécuter le projet sur votre propre machine (PC Windows, Mac ou Linux) :

### Prérequis
- **Node.js** version 20 ou supérieure installé sur votre ordinateur.
- Une clé API Gemini gratuite obtenue sur [Google AI Studio](https://aistudio.google.com/apikey).

### Étapes d'installation locale :
1. **Télécharger le code source** (via Git ou archive ZIP depuis AI Studio).
2. Ouvrir un terminal dans le dossier du projet.
3. Installer les dépendances :
   ```bash
   npm install
   ```
4. Créer un fichier `.env` à la racine :
   ```env
   GEMINI_API_KEY="VOTRE_CLE_API_GEMINI"
   PORT=3000
   ```
5. Lancer le serveur local :
   ```bash
   npm run dev
   ```
6. Ouvrir votre navigateur sur `http://localhost:3000`.

---

## Prochaines étapes proposées
- Ajouter le fichier `manifest.json` et les balises d'installation PWA dans `index.html`.
- Ajouter un composant d'installation guidée pour smartphone Android.
- Confirmez pour appliquer ces améliorations !
