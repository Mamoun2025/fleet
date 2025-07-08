const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Company = require('../models/Company');
const Client = require('../models/Client');
const Fleet = require('../models/Fleet');

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = async (req, res, next) => {
  try {
    const client = await Client.findById(req.client.id);
    if (!client || !client.isAdmin) {
      return res.status(403).json({ message: 'Accès refusé. Droits administrateur requis.' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
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
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// @route   GET api/companies
// @desc    Get all companies (admin principal only)
// @access  Private/PrimaryAdmin
router.get('/', [auth, isPrimaryAdmin], async (req, res) => {
  try {
    console.log('Récupération de toutes les entreprises...');
    const companies = await Company.find().sort({ created_at: -1 });
    console.log(`${companies.length} entreprises trouvées`);
    res.json(companies);
  } catch (err) {
    console.error('Erreur lors de la récupération des entreprises:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des entreprises', error: err.message });
  }
});

// @route   GET api/companies/:id
// @desc    Get company by ID
// @access  Private/PrimaryAdmin
router.get('/:id', [auth, isPrimaryAdmin], async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }
    res.json(company);
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   POST api/companies
// @desc    Create a company
// @access  Private/PrimaryAdmin
router.post('/', [auth, isPrimaryAdmin], async (req, res) => {
  try {
    console.log('Début de la création d\'entreprise...');
    console.log('Données reçues:', req.body);
    console.log('Utilisateur connecté:', req.client);
    
    const { name, description, address, phone } = req.body;
    
    if (!name) {
      console.log('Erreur: Nom d\'entreprise manquant');
      return res.status(400).json({ message: 'Le nom de l\'entreprise est requis' });
    }
    
    // Vérifier si une entreprise avec ce nom existe déjà
    console.log('Vérification si l\'entreprise existe déjà:', name);
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return res.status(400).json({ message: 'Une entreprise avec ce nom existe déjà' });
    }
    
    console.log('Démarrage d\'une transaction MongoDB...');
    // Démarrer une session de transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Créer une nouvelle entreprise
      console.log('Création de l\'entreprise:', name);
      const newCompany = new Company({
        name,
        description,
        address,
        phone
      });
      
      // Sauvegarder l'entreprise
      console.log('Sauvegarde de l\'entreprise...');
      await newCompany.save({ session });
      console.log('Entreprise sauvegardée avec ID:', newCompany._id);
      
      // Créer automatiquement une flotte pour cette entreprise
      console.log('Création de la flotte associée...');
      const fleet = new Fleet({
        company_id: newCompany._id,
        name: `Flotte de ${name}`,
        description: 'Flotte créée automatiquement'
      });
      
      // Sauvegarder la flotte
      console.log('Sauvegarde de la flotte...');
      await fleet.save({ session });
      console.log('Flotte sauvegardée avec ID:', fleet._id);
      
      // Valider la transaction
      console.log('Validation de la transaction...');
      await session.commitTransaction();
      session.endSession();
      console.log('Transaction validée avec succès');
      
      console.log('Entreprise créée avec succès:', newCompany);
      res.json(newCompany);
    } catch (err) {
      // En cas d'erreur, annuler la transaction
      console.error('Erreur lors de la création de l\'entreprise:', err);
      await session.abortTransaction();
      session.endSession();
      console.log('Transaction annulée');
      
      res.status(500).json({ 
        message: 'Erreur lors de la création de l\'entreprise ou de la flotte associée',
        error: err.message 
      });
    }
  } catch (err) {
    console.error('Erreur générale:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   PUT api/companies/:id
// @desc    Update a company
// @access  Private/PrimaryAdmin
router.put('/:id', [auth, isPrimaryAdmin], async (req, res) => {
  try {
    const { name, description, address, phone } = req.body;
    
    // Construire l'objet de mise à jour
    const companyFields = {};
    if (name) companyFields.name = name;
    if (description) companyFields.description = description;
    if (address) companyFields.address = address;
    if (phone) companyFields.phone = phone;
    
    let company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }
    
    company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: companyFields },
      { new: true }
    );
    
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   DELETE api/companies/:id
// @desc    Delete a company
// @access  Private/PrimaryAdmin
router.delete('/:id', [auth, isPrimaryAdmin], async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }
    
    // Supprimer tous les utilisateurs associés à cette entreprise
    await Client.deleteMany({ companyId: company._id });
    
    // Supprimer la flotte associée à cette entreprise
    await Fleet.deleteMany({ company_id: company._id });
    
    // Supprimer l'entreprise
    await company.remove();
    
    res.json({ message: 'Entreprise supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   GET api/companies/:id/users
// @desc    Get all users for a company
// @access  Private/Admin
router.get('/:id/users', [auth, isAdmin], async (req, res) => {
  try {
    const users = await Client.find({ companyId: req.params.id }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   GET api/companies/:id/fleet
// @desc    Get fleet for a company
// @access  Private/Admin
router.get('/:id/fleet', [auth, isAdmin], async (req, res) => {
  try {
    const fleet = await Fleet.findOne({ company_id: req.params.id });
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    res.json(fleet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
