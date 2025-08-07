import mongoose, { Schema, Document } from 'mongoose';

// Inventory Category interface as specified in PRD
export interface IInventoryCategory extends Document {
  id: string;
  name: string;
  description?: string;
  parentId?: mongoose.Schema.Types.ObjectId; // for hierarchical categories
  isActive: boolean;
  sortOrder: number;
  
  // Restaurant association
  restaurantId: mongoose.Schema.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const InventoryCategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryCategory', index: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes
InventoryCategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });
InventoryCategorySchema.index({ restaurantId: 1, parentId: 1, sortOrder: 1 });
InventoryCategorySchema.index({ restaurantId: 1, isActive: 1 });

// Virtual for subcategories
InventoryCategorySchema.virtual('subcategories', {
  ref: 'InventoryCategory',
  localField: '_id',
  foreignField: 'parentId'
});

// Virtual for items count
InventoryCategorySchema.virtual('itemsCount', {
  ref: 'InventoryItem',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Method to get full category path
InventoryCategorySchema.methods.getFullPath = async function() {
  const path = [this.name];
  let current = this;
  
  while (current.parentId) {
    current = await (this.constructor as any).findById(current.parentId);
    if (current) {
      path.unshift(current.name);
    } else {
      break;
    }
  }
  
  return path.join(' > ');
};

const InventoryCategoryModel = mongoose.model<IInventoryCategory>('InventoryCategory', InventoryCategorySchema);

export default InventoryCategoryModel;
export { InventoryCategoryModel as InventoryCategory };