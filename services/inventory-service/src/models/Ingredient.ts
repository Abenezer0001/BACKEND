import mongoose, { Schema, Document } from 'mongoose';

export interface IIngredient extends Document {
  name: string;
  restaurantId: mongoose.Schema.Types.ObjectId | string; // Assuming 'Restaurant' is a collection in another DB/service
  category?: string;
  supplier?: string;
  unitOfMeasurement: string;
  currentStockLevel: number;
  averageCostPrice: number;
  lowStockThreshold?: number;
  lastRestockedAt?: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Or String, if not linking directly
    category: { type: String },
    supplier: { type: String },
    unitOfMeasurement: { type: String, required: true },
    currentStockLevel: { type: Number, required: true, default: 0 },
    averageCostPrice: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    lastRestockedAt: { type: Date },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

export default mongoose.model<IIngredient>('Ingredient', IngredientSchema);
