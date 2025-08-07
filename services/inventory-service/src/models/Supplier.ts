import mongoose, { Schema, Document } from 'mongoose';

// Supplier interface as specified in PRD
export interface ISupplier extends Document {
  id: string;
  name: string;
  contactInfo: {
    email?: string;
    phone?: string;
    contactPerson?: string;
    website?: string;
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  paymentTerms: string; // e.g., "NET 30", "COD", "Payment upon delivery"
  deliveryDays: string[]; // e.g., ["Monday", "Wednesday", "Friday"]
  minimumOrder: number;
  rating: number; // 1-5 star rating
  isActive: boolean;
  notes?: string;
  
  // Restaurant association
  restaurantId: mongoose.Schema.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

// Contact Info schema
const ContactInfoSchema: Schema = new Schema({
  email: { type: String },
  phone: { type: String },
  contactPerson: { type: String },
  website: { type: String }
}, { _id: false });

// Address schema
const AddressSchema: Schema = new Schema({
  street: { type: String },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
  country: { type: String }
}, { _id: false });

const SupplierSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    contactInfo: ContactInfoSchema,
    address: AddressSchema,
    paymentTerms: { type: String, default: 'NET 30' },
    deliveryDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    minimumOrder: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5, default: 3 },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes
SupplierSchema.index({ restaurantId: 1, name: 1 });
SupplierSchema.index({ restaurantId: 1, isActive: 1 });
SupplierSchema.index({ name: 'text' });

const SupplierModel = mongoose.model<ISupplier>('Supplier', SupplierSchema);

export default SupplierModel;
export { SupplierModel as Supplier };