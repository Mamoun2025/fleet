const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Company = require('../models/Company');
const Fleet = require('../models/Fleet');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, companyName, isAdmin = false } = req.body;
    
    // Vérifier si le client existe déjà
    let client = await Client.findOne({ email });
    if (client) {
      return res.status(400).json({ message: 'Cet utilisateur existe déjà' });
    }
    
    // Créer un nouveau client
    client = new Client({
      name,
      email,
      password,
      isAdmin
    });
    
    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    client.password = await bcrypt.hash(password, salt);
    
    // Si c'est un nouvel utilisateur avec une entreprise
    if (companyName) {
      // Créer une nouvelle entreprise
      const company = new Company({
        name: companyName,
        description: `Entreprise de ${name}`
      });
      
      await company.save();
      
      // Associer l'utilisateur à l'entreprise
      client.companyId = company._id;
      
      // Créer une flotte pour cette entreprise
      const fleet = new Fleet({
        company_id: company._id,
        name: `Flotte de ${companyName}`,
        description: 'Flotte créée automatiquement'
      });
      
      await fleet.save();
    }
    
    // Sauvegarder le client
    await client.save();
    
    // Créer et retourner un token JWT
    const payload = {
      client: {
        id: client.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Vérifier si le client existe
    let client = await Client.findOne({ email });
    if (!client) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }
    
    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }
    
    // Créer et retourner un token JWT
    const payload = {
      client: {
        id: client.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Route de vérification du token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ message: 'Pas de token, autorisation refusée' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await Client.findById(decoded.client.id).select('-password');
    
    if (!client) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Si l'utilisateur est associé à une entreprise, récupérer les informations de l'entreprise
    if (client.companyId) {
      const company = await Company.findById(client.companyId);
      if (company) {
        // Récupérer la flotte associée à l'entreprise
        const fleet = await Fleet.findOne({ company_id: company._id });
        if (fleet) {
          // Ajouter les informations de flotte à la réponse
          const clientData = client.toObject();
          clientData.company = company;
          clientData.fleet = fleet;
          return res.json(clientData);
        }
      }
    }
    
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Token invalide' });
  }
});

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = async (req, res, next) => {
  try {
    const client = await Client.findById(req.client.id);
    
    if (!client || !client.isAdmin) {
      return res.status(403).json({ message: 'Accès refusé. Droits administrateur requis.' });
    }
    
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
};

// Middleware pour vérifier si l'utilisateur est administrateur (sans restriction d'email)
const isPrimaryAdmin = async (req, res, next) => {
  try {
    console.log('Vérification des droits administrateur...');
    const client = await Client.findById(req.client.id);
    console.log('Client trouvé:', client ? { id: client._id, email: client.email, isAdmin: client.isAdmin } : 'Aucun client');
    
    if (!client) {
      console.log('Accès refusé: Client non trouvé');
      return res.status(403).json({ message: 'Accès refusé. Utilisateur non trouvé.' });
    }
    
    if (!client.isAdmin) {
      console.log('Accès refusé: Client non admin');
      return res.status(403).json({ message: 'Accès refusé. Droits administrateur requis.' });
    }
    
    // Accepter tous les administrateurs sans vérification d'email
    console.log('Accès autorisé pour l\'administrateur:', client.email);
    next();
  } catch (err) {
    console.error('Erreur dans le middleware isPrimaryAdmin:', err);
    res.status(500).send('Erreur serveur');
  }
};

// Route pour s'assurer que l'utilisateur admin@test.com existe
router.get('/ensure-admin', async (req, res) => {
  try {
    // Vérifier si l'utilisateur admin@test.com existe déjà
    let adminUser = await Client.findOne({ email: 'admin@test.com' });
    
    if (adminUser) {
      // S'assurer qu'il est bien administrateur
      if (!adminUser.isAdmin) {
        adminUser.isAdmin = true;
        await adminUser.save();
        console.log('Utilisateur admin@test.com mis à jour avec les droits admin');
      }
      return res.json({ message: 'L\'utilisateur admin@test.com existe déjà et a les droits admin', adminUser });
    }
    
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
    
    res.json({ message: 'Utilisateur admin@test.com créé avec succès', adminUser });
  } catch (err) {
    console.error('Erreur lors de la création de l\'utilisateur admin:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Route pour créer un utilisateur administrateur
router.post('/create-admin', async (req, res) => {
  try {
    // Extraire les données du corps de la requête
    const { name, email, password } = req.body;
    
    // Si l'email est admin@test.com, on autorise sa création même s'il existe déjà un admin
    if (email !== 'admin@test.com') {
      // Pour les autres emails, vérifier s'il existe déjà un administrateur
      const adminExists = await Client.findOne({ isAdmin: true });
      if (adminExists) {
        return res.status(400).json({ message: 'Un administrateur existe déjà. Utilisez le compte existant.' });
      }
    }
    
    // Vérifier si l'email est déjà utilisé
    let client = await Client.findOne({ email });
    if (client) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    
    // Créer un nouvel administrateur
    client = new Client({
      name,
      email,
      password,
      isAdmin: true
    });
    
    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    client.password = await bcrypt.hash(password, salt);
    
    // Sauvegarder l'administrateur
    await client.save();
    
    // Créer et retourner un token JWT
    const payload = {
      client: {
        id: client.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Route pour créer un utilisateur pour une entreprise existante (admin principal seulement)
router.post('/create-user', [auth, isPrimaryAdmin], async (req, res) => {
  try {
    const { name, email, password, companyId } = req.body;
    
    // Vérifier si l'entreprise existe
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }
    
    // Vérifier si l'email est déjà utilisé
    let client = await Client.findOne({ email });
    if (client) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    
    // Créer un nouvel utilisateur
    client = new Client({
      name,
      email,
      password,
      companyId
    });
    
    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    client.password = await bcrypt.hash(password, salt);
    
    // Sauvegarder l'utilisateur
    await client.save();
    
    res.json(client);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Route pour récupérer tous les utilisateurs (admin principal seulement)
router.get('/users', [auth, isPrimaryAdmin], async (req, res) => {
  try {
    console.log('Récupération de tous les utilisateurs...');
    const clients = await Client.find().select('-password');
    console.log(`${clients.length} utilisateurs trouvés`);
    res.json(clients);
  } catch (err) {
    console.error('Erreur lors de la récupération des utilisateurs:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des utilisateurs', error: err.message });
  }
});

module.exports = router;
