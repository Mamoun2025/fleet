const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Chargement des variables d'environnement
dotenv.config();

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du dossier public
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
console.log('Serving static files from:', path.join(__dirname, 'public'));

// Connexion à MongoDB avec options améliorées
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000, // Timeout après 30 secondes au lieu de 10s par défaut
  socketTimeoutMS: 45000,         // Augmenter le timeout du socket
  maxPoolSize: 10,                // Limiter le nombre de connexions simultanées
  connectTimeoutMS: 30000         // Timeout de connexion
})
.then(() => {
  console.log('Connexion à MongoDB Atlas réussie !');
})
.catch((err) => {
  console.error('Erreur de connexion à MongoDB:', err);
  console.log('Application démarrée en mode déconnecté. Certaines fonctionnalités peuvent être limitées.');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/fleets', require('./routes/fleets'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/sync', require('./routes/sync'));

// Route racine pour servir la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route explicite pour la page admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Route API pour vérifier que le serveur fonctionne
app.get('/api', (req, res) => {
  res.json({ message: 'API Fleet Management opérationnelle' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Fonction pour créer/vérifier le compte super admin
async function ensureAdminExists() {
  try {
    const Client = require('./models/Client');
    const bcrypt = require('bcryptjs');
    
    // Vérifier si l'utilisateur admin@test.com existe déjà
    let adminUser = await Client.findOne({ email: 'admin@test.com' });
    
    if (adminUser) {
      // S'assurer qu'il est bien administrateur
      if (!adminUser.isAdmin) {
        adminUser.isAdmin = true;
        await adminUser.save();
        console.log('Utilisateur admin@test.com mis à jour avec les droits admin');
      } else {
        console.log('L\'utilisateur admin@test.com existe déjà et a les droits admin');
      }
    } else {
      // Créer l'utilisateur admin@test.com s'il n'existe pas
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin', salt);
      
      adminUser = new Client({
        name: 'Admin',
        email: 'admin@test.com',
        password: hashedPassword,
        isAdmin: true
      });
      
      await adminUser.save();
      console.log('Utilisateur admin@test.com créé avec succès');
    }
    
    // Supprimer tous les autres comptes admin (sauf admin@test.com)
    await Client.updateMany(
      { email: { $ne: 'admin@test.com' }, isAdmin: true },
      { $set: { isAdmin: false } }
    );
    console.log('Tous les autres comptes admin ont été révoqués');
    
  } catch (err) {
    console.error('Erreur lors de la création/vérification du compte admin:', err);
  }
}

// Démarrage du serveur
app.listen(PORT, async () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  
  // Créer/vérifier le compte admin au démarrage
  await ensureAdminExists();
});
