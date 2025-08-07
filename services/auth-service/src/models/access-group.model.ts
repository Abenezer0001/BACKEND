import mongoose, { Document, Schema } from 'mongoose';
import { IPermission } from './permission.model';

export interface IAccessGroup extends Document {
  name: string;
  description: string;
  permissions: IPermission[] | string[];
  createdAt: Date;
  updatedAt: Date;
}

const AccessGroupSchema = new Schema<IAccessGroup>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      required: false
    },
    permissions: [{
      type: Schema.Types.ObjectId,
      ref: 'Permission'
    }]
  },
  {
    timestamps: true
  }
);

// Create a compound index for efficient querying
AccessGroupSchema.index({ name: 1 });

export const AccessGroup = mongoose.model<IAccessGroup>('AccessGroup', AccessGroupSchema); 