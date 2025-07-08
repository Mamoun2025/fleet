const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChangeSchema = new Schema({
  client_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  fleet_id: {
    type: Schema.Types.ObjectId,
    ref: 'Fleet',
    required: true
  },
  vehicle_id: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  change_type: {
    type: String,
    enum: ['edit', 'import', 'new', 'delete'],
    required: true
  },
  field: {
    type: String
  },
  old_value: {
    type: Schema.Types.Mixed
  },
  new_value: {
    type: Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  user_info: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model('Change', ChangeSchema);
