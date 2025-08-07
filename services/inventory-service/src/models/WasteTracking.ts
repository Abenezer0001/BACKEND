import mongoose, { Schema, Document } from 'mongoose';

// Waste Tracking interface as specified in PRD
export interface IWasteTracking extends Document {
  id: string;
  inventoryItemId: mongoose.Schema.Types.ObjectId;
  quantity: number;
  unit: string;
  reason: 'expired' | 'spoiled' | 'damaged' | 'overproduction' | 'preparation_error' | 'customer_return' | 'other';
  cost: number; // calculated cost of wasted item
  dateWasted: Date;
  userId: mongoose.Schema.Types.ObjectId; // who reported the waste
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
  
  // Restaurant association
  restaurantId: mongoose.Schema.Types.ObjectId;
  
  // Optional prevention suggestions
  preventionSuggestions?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const WasteTrackingSchema: Schema = new Schema(
  {
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    reason: {
      type: String,
      required: true,
      enum: ['expired', 'spoiled', 'damaged', 'overproduction', 'preparation_error', 'customer_return', 'other'],
      index: true
    },
    cost: { type: Number, required: true },
    dateWasted: { type: Date, default: Date.now, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batchNumber: { type: String, index: true },
    expiryDate: { type: Date },
    notes: { type: String },
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    
    // Prevention suggestions
    preventionSuggestions: [{ type: String }]
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance and analytics
WasteTrackingSchema.index({ restaurantId: 1, dateWasted: -1 });
WasteTrackingSchema.index({ restaurantId: 1, inventoryItemId: 1, dateWasted: -1 });
WasteTrackingSchema.index({ restaurantId: 1, reason: 1, dateWasted: -1 });
WasteTrackingSchema.index({ restaurantId: 1, cost: -1 });
WasteTrackingSchema.index({ expiryDate: 1 });

// Virtual for waste category
WasteTrackingSchema.virtual('wasteCategory').get(function() {
  const preventableReasons = ['expired', 'spoiled', 'overproduction'];
  const operationalReasons = ['preparation_error', 'damaged'];
  const customerReasons = ['customer_return'];
  
  if (preventableReasons.includes(this.reason)) return 'preventable';
  if (operationalReasons.includes(this.reason)) return 'operational';
  if (customerReasons.includes(this.reason)) return 'customer';
  return 'other';
});

// Virtual for waste severity (based on cost)
WasteTrackingSchema.virtual('severity').get(function() {
  if (this.cost >= 50) return 'high';
  if (this.cost >= 20) return 'medium';
  return 'low';
});

// Static method to get waste analytics for a restaurant
WasteTrackingSchema.statics.getWasteAnalytics = function(restaurantId: string, startDate?: Date, endDate?: Date) {
  const matchQuery: any = { restaurantId };
  
  if (startDate || endDate) {
    matchQuery.dateWasted = {};
    if (startDate) matchQuery.dateWasted.$gte = startDate;
    if (endDate) matchQuery.dateWasted.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$reason',
        totalCost: { $sum: '$cost' },
        totalQuantity: { $sum: '$quantity' },
        count: { $sum: 1 },
        avgCost: { $avg: '$cost' }
      }
    },
    { $sort: { totalCost: -1 } }
  ]);
};

// Method to generate prevention suggestions based on waste reason
WasteTrackingSchema.methods.generatePreventionSuggestions = function() {
  const suggestions: string[] = [];
  
  switch (this.reason) {
    case 'expired':
      suggestions.push('Implement FIFO (First In, First Out) rotation');
      suggestions.push('Review inventory ordering quantities');
      suggestions.push('Set up expiry date alerts');
      break;
    case 'spoiled':
      suggestions.push('Check storage temperature and conditions');
      suggestions.push('Review storage procedures');
      suggestions.push('Improve inventory rotation');
      break;
    case 'overproduction':
      suggestions.push('Review demand forecasting');
      suggestions.push('Adjust production planning');
      suggestions.push('Consider smaller batch sizes');
      break;
    case 'preparation_error':
      suggestions.push('Provide additional staff training');
      suggestions.push('Review recipe instructions');
      suggestions.push('Implement quality checkpoints');
      break;
    case 'damaged':
      suggestions.push('Review handling procedures');
      suggestions.push('Check packaging quality');
      suggestions.push('Improve storage methods');
      break;
  }
  
  this.preventionSuggestions = suggestions;
  return this;
};

const WasteTrackingModel = mongoose.model<IWasteTracking>('WasteTracking', WasteTrackingSchema);

export default WasteTrackingModel;
export { WasteTrackingModel as WasteTracking };