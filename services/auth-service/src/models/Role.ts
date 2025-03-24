import mongoose, { Schema, Document, Types } from 'mongoose';
import { IPermission } from './Permission';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: Types.ObjectId[] | IPermission[];
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }]
});

export const Role = mongoose.model<IRole>('Role', RoleSchema);
