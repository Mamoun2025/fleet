const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FleetSchema = new Schema({
  company_id: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Fleet', FleetSchema);
