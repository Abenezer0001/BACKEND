import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

interface IUser extends Document {
  email: string;
  password: string;
  roles: mongoose.Types.ObjectId[];
  permissions: mongoose.Types.ObjectId[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    roles: [{
      type: Schema.Types.ObjectId,
      ref: 'Role'
    }],
    permissions: [{
      type: Schema.Types.ObjectId,
      ref: 'Permission'
    }]
  },
  {
    timestamps: true
  }
);

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create a compound index for efficient querying
UserSchema.index({ email: 1 });

// Check if the model exists before creating it
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export { User };
export type { IUser };
