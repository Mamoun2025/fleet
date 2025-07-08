require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Client = require('./models/Client');

// Connexion à MongoDB
const MONGODB_URI = 'mongodb+srv://mamounbenmoussa:PvNWKh9qH2pxn2hN@fleet-prod-cluster.wqcxqtx.mongodb.net/fleetdb';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connexion à MongoDB Atlas réussie'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB Atlas:', err);
    process.exit(1);
  });

async function createAdminUser() {
  try {
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
    
    // Afficher tous les utilisateurs admin pour vérification
    const allAdmins = await Client.find({ isAdmin: true });
    console.log('Liste des administrateurs:', allAdmins.map(admin => ({ 
      id: admin._id, 
      name: admin.name, 
      email: admin.email, 
      isAdmin: admin.isAdmin 
    })));
    
    // Fermer la connexion à MongoDB
    mongoose.connection.close();
    console.log('Connexion à MongoDB fermée');
  } catch (err) {
    console.error('Erreur lors de la création de l\'utilisateur admin:', err);
    mongoose.connection.close();
  }
}

// Exécuter la fonction
createAdminUser();
