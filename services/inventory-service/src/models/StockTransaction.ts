import mongoose, { Schema, Document } from 'mongoose';

export interface IStockTransaction extends Document {
  restaurantId: mongoose.Schema.Types.ObjectId;
  ingredientId: mongoose.Schema.Types.ObjectId;
  recipeId?: mongoose.Schema.Types.ObjectId;
  orderId?: string;
  transactionType: 'Sale Deduction' | 'Manual Adjustment' | 'Initial Stock' | 'Spoilage' | 'Procurement';
  quantityChange: number;
  stockLevelBefore: number;
  stockLevelAfter: number;
  notes?: string;
  transactionDate: Date;
  createdBy?: mongoose.Schema.Types.ObjectId; // Assuming 'User' model might exist elsewhere
}

const StockTransactionSchema: Schema = new Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: false, index: true },
    orderId: { type: String, required: false, index: true },
    transactionType: {
      type: String,
      required: true,
      enum: ['Sale Deduction', 'Manual Adjustment', 'Initial Stock', 'Spoilage', 'Procurement'],
    },
    quantityChange: { type: Number, required: true },
    stockLevelBefore: { type: Number, required: true },
    stockLevelAfter: { type: Number, required: true },
    notes: { type: String },
    transactionDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

export default mongoose.model<IStockTransaction>('StockTransaction', StockTransactionSchema);
