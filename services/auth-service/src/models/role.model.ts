import mongoose, { Document, Schema } from 'mongoose';
import { Permission, IPermission } from './permission.model';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: IPermission[] | string[];
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
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
RoleSchema.index({ name: 1 });

export const Role = mongoose.model<IRole>('Role', RoleSchema); 