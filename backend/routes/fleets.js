const express = require('express');
const router = express.Router();
const Fleet = require('../models/Fleet');
const Vehicle = require('../models/Vehicle');
const auth = require('../middleware/auth');

// Obtenir toutes les flottes d'un client
router.get('/', auth, async (req, res) => {
  try {
    const fleets = await Fleet.find({ client_id: req.client.id });
    res.json(fleets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Créer une nouvelle flotte
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    const newFleet = new Fleet({
      name,
      client_id: req.client.id
    });
    
    const fleet = await newFleet.save();
    res.json(fleet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Obtenir une flotte spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    const fleet = await Fleet.findById(req.params.id);
    
    // Vérifier si la flotte existe
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    
    // Vérifier si la flotte appartient au client
    if (fleet.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    res.json(fleet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Mettre à jour une flotte
router.put('/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Trouver la flotte
    let fleet = await Fleet.findById(req.params.id);
    
    // Vérifier si la flotte existe
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    
    // Vérifier si la flotte appartient au client
    if (fleet.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    // Mettre à jour la flotte
    fleet.name = name;
    fleet.last_updated = Date.now();
    
    await fleet.save();
    res.json(fleet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Supprimer une flotte
router.delete('/:id', auth, async (req, res) => {
  try {
    // Trouver la flotte
    const fleet = await Fleet.findById(req.params.id);
    
    // Vérifier si la flotte existe
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    
    // Vérifier si la flotte appartient au client
    if (fleet.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    // Supprimer tous les véhicules associés à cette flotte
    await Vehicle.deleteMany({ fleet_id: req.params.id });
    
    // Supprimer la flotte
    await Fleet.findByIdAndRemove(req.params.id);
    
    res.json({ message: 'Flotte supprimée' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Obtenir tous les véhicules d'une flotte
router.get('/:id/vehicles', auth, async (req, res) => {
  try {
    // Vérifier si la flotte existe et appartient au client
    const fleet = await Fleet.findById(req.params.id);
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    
    if (fleet.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    // Obtenir tous les véhicules de la flotte
    const vehicles = await Vehicle.find({ fleet_id: req.params.id });
    res.json(vehicles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
