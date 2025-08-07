// File: services/restaurant-service/models/Promotion.ts (or similar path)
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICombo {
  name: string;
  description?: string;
  menuItems: Types.ObjectId[]; // Array of MenuItem references
  discountRate: number; // Percentage discount (0-100)
}

export interface IPromotion extends Document {
  title: string;
  description?: string;
  imageUrl: string; // URL to the hosted image
  restaurantId: Types.ObjectId; // Link to the Restaurant model
  enabledVenues: Types.ObjectId[]; // Array of venue IDs where promotion is enabled
  isActive: boolean; // Admin can toggle this on/off
  displayOnSplash: boolean; // True if it should appear on splash/carousel
  startDate: Date; // When the promotion becomes potentially visible
  endDate: Date; // When the promotion is no longer visible
  
  // Combo functionality
  combos: ICombo[]; // Array of combos associated with this promotion
  
  createdAt: Date;
  updatedAt: Date;
  // Future: linkTo (e.g., { type: 'MENU_ITEM', id: 'itemId' } or { type: 'CATEGORY', id: 'catId' } or { type: 'URL', url: 'extUrl'})
}

const ComboSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  menuItems: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'MenuItem', 
    required: true 
  }],
  discountRate: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  }
}, { _id: true });

const PromotionSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  imageUrl: { type: String, required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  enabledVenues: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Venue',
    index: true
  }], // Array of venues where this promotion is enabled
  isActive: { type: Boolean, default: true, index: true },
  displayOnSplash: { type: Boolean, default: true, index: true }, // To identify for carousel
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  
  // Combo functionality
  combos: [ComboSchema], // Array of combos with embedded schema
  
  // linkTo: { type: Object } // For future linking capabilities
}, {
  timestamps: true
});

// Add compound indexes for better query performance
PromotionSchema.index({ restaurantId: 1, isActive: 1, displayOnSplash: 1 });
PromotionSchema.index({ enabledVenues: 1, isActive: 1, startDate: 1, endDate: 1 });

export default mongoose.model<IPromotion>('Promotion', PromotionSchema);
