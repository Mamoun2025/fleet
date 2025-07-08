const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Change = require('../models/Change');
const Fleet = require('../models/Fleet');
const auth = require('../middleware/auth');

// Envoyer les modifications locales au serveur
router.post('/upload', auth, async (req, res) => {
  try {
    const { fleetId, data, lastSyncTimestamp } = req.body;
    
    // Vérifier si la flotte existe et appartient au client
    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    
    if (fleet.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    // Traiter les données reçues
    const results = {
      processed: 0,
      conflicts: []
    };
    
    for (const item of data) {
      try {
        // Vérifier si le véhicule existe
        let vehicle = await Vehicle.findOne({ 
          client_id: req.client.id, 
          vehicle_id: item.vehicle_id 
        });
        
        if (vehicle) {
          // Vérifier s'il y a eu des modifications sur le serveur depuis la dernière synchronisation
          const serverChanges = await Change.find({
            vehicle_id: vehicle._id,
            timestamp: { $gt: new Date(lastSyncTimestamp) }
          });
          
          if (serverChanges.length > 0) {
            // Il y a un conflit
            results.conflicts.push({
              vehicle_id: item.vehicle_id,
              server_data: vehicle.data,
              client_data: item.data
            });
          } else {
            // Pas de conflit, mettre à jour le véhicule
            const oldData = { ...vehicle.data };
            vehicle.data = item.data;
            vehicle.last_updated = Date.now();
            
            await vehicle.save();
            
            // Enregistrer la modification
            const change = new Change({
              client_id: req.client.id,
              fleet_id: fleetId,
              vehicle_id: vehicle._id,
              change_type: 'edit',
              old_value: oldData,
              new_value: item.data,
              user_info: {
                user_agent: req.headers['user-agent'],
                ip: req.ip,
                sync: true
              }
            });
            
            await change.save();
            
            results.processed++;
          }
        } else {
          // Créer un nouveau véhicule
          const newVehicle = new Vehicle({
            fleet_id: fleetId,
            client_id: req.client.id,
            vehicle_id: item.vehicle_id,
            data: item.data
          });
          
          const savedVehicle = await newVehicle.save();
          
          // Enregistrer la modification
          const change = new Change({
            client_id: req.client.id,
            fleet_id: fleetId,
            vehicle_id: savedVehicle._id,
            change_type: 'new',
            new_value: item.data,
            user_info: {
              user_agent: req.headers['user-agent'],
              ip: req.ip,
              sync: true
            }
          });
          
          await change.save();
          
          results.processed++;
        }
      } catch (error) {
        results.conflicts.push({
          vehicle_id: item.vehicle_id,
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

// Récupérer les modifications depuis le serveur
router.get('/changes', auth, async (req, res) => {
  try {
    const { fleetId, lastSyncTimestamp } = req.query;
    
    // Vérifier si la flotte existe et appartient au client
    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      return res.status(404).json({ message: 'Flotte non trouvée' });
    }
    
    if (fleet.client_id.toString() !== req.client.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    
    // Récupérer les modifications depuis la dernière synchronisation
    const changes = await Change.find({
      fleet_id: fleetId,
      timestamp: { $gt: new Date(lastSyncTimestamp) }
    }).sort({ timestamp: 1 });
    
    // Récupérer les véhicules correspondants
    const vehicleIds = [...new Set(changes.map(change => change.vehicle_id))];
    const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } });
    
    // Créer un mapping des véhicules pour un accès facile
    const vehicleMap = {};
    vehicles.forEach(vehicle => {
      vehicleMap[vehicle._id] = vehicle;
    });
    
    // Préparer les données à renvoyer
    const result = {
      changes: changes.map(change => ({
        change_id: change._id,
        change_type: change.change_type,
        timestamp: change.timestamp,
        vehicle_id: vehicleMap[change.vehicle_id] ? vehicleMap[change.vehicle_id].vehicle_id : null,
        data: vehicleMap[change.vehicle_id] ? vehicleMap[change.vehicle_id].data : null
      })),
      current_timestamp: new Date()
    };
    
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Résoudre les conflits de synchronisation
router.post('/resolve', auth, async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    const results = {
      resolved: 0,
      errors: []
    };
    
    for (const resolution of resolutions) {
      try {
        const { vehicle_id, resolution_type, data } = resolution;
        
        // Trouver le véhicule
        const vehicle = await Vehicle.findOne({ 
          client_id: req.client.id, 
          vehicle_id 
        });
        
        if (!vehicle) {
          results.errors.push({
            vehicle_id,
            error: 'Véhicule non trouvé'
          });
          continue;
        }
        
        if (resolution_type === 'use_server') {
          // Rien à faire, les données du serveur sont déjà à jour
          results.resolved++;
        } else if (resolution_type === 'use_client') {
          // Utiliser les données du client
          const oldData = { ...vehicle.data };
          vehicle.data = data;
          vehicle.last_updated = Date.now();
          
          await vehicle.save();
          
          // Enregistrer la résolution
          const change = new Change({
            client_id: req.client.id,
            fleet_id: vehicle.fleet_id,
            vehicle_id: vehicle._id,
            change_type: 'conflict_resolution',
            old_value: oldData,
            new_value: data,
            user_info: {
              user_agent: req.headers['user-agent'],
              ip: req.ip,
              resolution: 'use_client'
            }
          });
          
          await change.save();
          
          results.resolved++;
        } else if (resolution_type === 'merge') {
          // Fusionner les données
          const oldData = { ...vehicle.data };
          vehicle.data = data;
          vehicle.last_updated = Date.now();
          
          await vehicle.save();
          
          // Enregistrer la résolution
          const change = new Change({
            client_id: req.client.id,
            fleet_id: vehicle.fleet_id,
            vehicle_id: vehicle._id,
            change_type: 'conflict_resolution',
            old_value: oldData,
            new_value: data,
            user_info: {
              user_agent: req.headers['user-agent'],
              ip: req.ip,
              resolution: 'merge'
            }
          });
          
          await change.save();
          
          results.resolved++;
        } else {
          results.errors.push({
            vehicle_id,
            error: 'Type de résolution invalide'
          });
        }
      } catch (error) {
        results.errors.push({
          vehicle_id: resolution.vehicle_id,
          error: error.message
        });
      }
    }
    
    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
