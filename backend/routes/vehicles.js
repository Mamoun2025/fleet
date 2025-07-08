const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Fleet = require('../models/Fleet');
const Change = require('../models/Change');
const auth = require('../middleware/auth');

// Ajouter un nouveau véhicule
router.post('/', auth, async (req, res) => {
  try {
    const { fleet_id, vehicle_id, data } = req.body;
    
    // Vérifier si la flotte existe et appartient au client
    const fleet = await Fleet.findById(fleet_id);
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    
    if (fleet.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    // Vérifier si un véhicule avec cet ID existe déjà pour ce client
    const existingVehicle = await Vehicle.findOne({ 
      client_id: req.client.id, 
      vehicle_id: vehicle_id 
    });
    
    if (existingVehicle) {
      return res.status(400).json({ message: 'Un véhicule avec cet ID existe déjà' });
    }
    
    // Créer un nouveau véhicule
    const newVehicle = new Vehicle({
      fleet_id,
      client_id: req.client.id,
      vehicle_id,
      data
    });
    
    const vehicle = await newVehicle.save();
    
    // Enregistrer la modification
    const change = new Change({
      client_id: req.client.id,
      fleet_id,
      vehicle_id: vehicle._id,
      change_type: 'new',
      new_value: data,
      user_info: {
        user_agent: req.headers['user-agent'],
        ip: req.ip
      }
    });
    
    await change.save();
    
    // Mettre à jour la date de dernière modification de la flotte
    fleet.last_updated = Date.now();
    await fleet.save();
    
    res.json(vehicle);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Obtenir un véhicule spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    // Vérifier si le véhicule existe
    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }
    
    // Vérifier si le véhicule appartient au client
    if (vehicle.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    res.json(vehicle);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Mettre à jour un véhicule
router.put('/:id', auth, async (req, res) => {
  try {
    const { data } = req.body;
    
    // Trouver le véhicule
    let vehicle = await Vehicle.findById(req.params.id);
    
    // Vérifier si le véhicule existe
    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }
    
    // Vérifier si le véhicule appartient au client
    if (vehicle.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    // Sauvegarder l'ancienne valeur pour le journal des modifications
    const oldData = { ...vehicle.data };
    
    // Mettre à jour le véhicule
    vehicle.data = data;
    vehicle.last_updated = Date.now();
    
    await vehicle.save();
    
    // Enregistrer la modification
    const change = new Change({
      client_id: req.client.id,
      fleet_id: vehicle.fleet_id,
      vehicle_id: vehicle._id,
      change_type: 'edit',
      old_value: oldData,
      new_value: data,
      user_info: {
        user_agent: req.headers['user-agent'],
        ip: req.ip
      }
    });
    
    await change.save();
    
    // Mettre à jour la date de dernière modification de la flotte
    const fleet = await Fleet.findById(vehicle.fleet_id);
    if (fleet) {
      fleet.last_updated = Date.now();
      await fleet.save();
    }
    
    res.json(vehicle);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Supprimer un véhicule
router.delete('/:id', auth, async (req, res) => {
  try {
    // Trouver le véhicule
    const vehicle = await Vehicle.findById(req.params.id);
    
    // Vérifier si le véhicule existe
    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }
    
    // Vérifier si le véhicule appartient au client
    if (vehicle.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    // Enregistrer la suppression dans le journal des modifications
    const change = new Change({
      client_id: req.client.id,
      fleet_id: vehicle.fleet_id,
      vehicle_id: vehicle._id,
      change_type: 'delete',
      old_value: vehicle.data,
      user_info: {
        user_agent: req.headers['user-agent'],
        ip: req.ip
      }
    });
    
    await change.save();
    
    // Supprimer le véhicule
    await Vehicle.findByIdAndRemove(req.params.id);
    
    // Mettre à jour la date de dernière modification de la flotte
    const fleet = await Fleet.findById(vehicle.fleet_id);
    if (fleet) {
      fleet.last_updated = Date.now();
      await fleet.save();
    }
    
    res.json({ message: 'Véhicule supprimé' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Import en masse de véhicules
router.post('/batch', auth, async (req, res) => {
  try {
    const { fleet_id, vehicles } = req.body;
    
    // Vérifier si la flotte existe et appartient au client
    const fleet = await Fleet.findById(fleet_id);
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    
    if (fleet.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    const results = {
      added: 0,
      updated: 0,
      errors: []
    };
    
    // Traiter chaque véhicule
    for (const vehicleData of vehicles) {
      try {
        // Vérifier si le véhicule existe déjà
        let vehicle = await Vehicle.findOne({ 
          client_id: req.client.id, 
          vehicle_id: vehicleData.vehicle_id 
        });
        
        if (vehicle) {
          // Mettre à jour le véhicule existant
          const oldData = { ...vehicle.data };
          vehicle.data = vehicleData.data;
          vehicle.last_updated = Date.now();
          
          await vehicle.save();
          
          // Enregistrer la modification
          const change = new Change({
            client_id: req.client.id,
            fleet_id,
            vehicle_id: vehicle._id,
            change_type: 'import',
            old_value: oldData,
            new_value: vehicleData.data,
            user_info: {
              user_agent: req.headers['user-agent'],
              ip: req.ip
            }
          });
          
          await change.save();
          
          results.updated++;
        } else {
          // Créer un nouveau véhicule
          const newVehicle = new Vehicle({
            fleet_id,
            client_id: req.client.id,
            vehicle_id: vehicleData.vehicle_id,
            data: vehicleData.data
          });
          
          const savedVehicle = await newVehicle.save();
          
          // Enregistrer la modification
          const change = new Change({
            client_id: req.client.id,
            fleet_id,
            vehicle_id: savedVehicle._id,
            change_type: 'import',
            new_value: vehicleData.data,
            user_info: {
              user_agent: req.headers['user-agent'],
              ip: req.ip
            }
          });
          
          await change.save();
          
          results.added++;
        }
      } catch (error) {
        results.errors.push({
          vehicle_id: vehicleData.vehicle_id,
          error: error.message
        });
      }
    }
    
    // Mettre à jour la date de dernière modification de la flotte
    fleet.last_updated = Date.now();
    await fleet.save();
    
    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
