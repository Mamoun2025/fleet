const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schéma flexible pour permettre différentes propriétés de véhicules
const VehicleSchema = new Schema({
  fleet_id: {
    type: Schema.Types.ObjectId,
    ref: 'Fleet',
    required: true
  },
  client_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  // Champ ID du véhicule (comme dans votre application actuelle)
  vehicle_id: {
    type: String,
    required: true
  },
  // Stockage flexible des données du véhicule
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  // Permet d'ajouter des champs dynamiques
  strict: false
});

// Index composé pour garantir l'unicité des IDs de véhicules par client
VehicleSchema.index({ client_id: 1, vehicle_id: 1 }, { unique: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);
