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
  console.log('Connexion à MongoDB Atlas réussie');
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

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API Fleet Management opérationnelle' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
