import mongoose, { Document, Schema } from 'mongoose';

export interface INotionIntegration extends Document {
  restaurantId: mongoose.Types.ObjectId;
  workspaceId: string;
  workspaceName: string;
  accessToken: string;
  menuPageId: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  syncStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  lastSyncedAt?: Date;
  lastSyncError?: string;
  webhookId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const NotionIntegrationSchema: Schema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    workspaceId: {
      type: String,
      required: true,
      trim: true,
    },
    workspaceName: {
      type: String,
      required: true,
      trim: true,
    },
    accessToken: {
      type: String,
      required: true,
      trim: true,
    },
    menuPageId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    refreshToken: {
      type: String,
      trim: true,
    },
    tokenExpiresAt: {
      type: Date,
    },
    syncStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
    },
    lastSyncedAt: {
      type: Date,
    },
    lastSyncError: {
      type: String,
    },
    webhookId: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure each restaurant can only have one active integration
NotionIntegrationSchema.index({ restaurantId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Index for queries based on workspaceId
NotionIntegrationSchema.index({ workspaceId: 1 });

// Compound index for sync monitoring
NotionIntegrationSchema.index({ syncStatus: 1, lastSyncedAt: 1 });

// Methods

NotionIntegrationSchema.methods.deactivate = async function(): Promise<void> {
  this.isActive = false;
  await this.save();
};

NotionIntegrationSchema.methods.updateSyncStatus = async function(
  status: 'pending' | 'in_progress' | 'completed' | 'failed',
  error?: string
): Promise<void> {
  this.syncStatus = status;
  this.lastSyncedAt = new Date();
  
  if (error) {
    this.lastSyncError = error;
  } else if (status === 'completed') {
    this.lastSyncError = undefined;
  }
  
  await this.save();
};

// Statics

NotionIntegrationSchema.statics.findByMenuPageId = async function(
  menuPageId: string
): Promise<INotionIntegration | null> {
  return this.findOne({ menuPageId, isActive: true });
};

NotionIntegrationSchema.statics.findActiveByRestaurantId = async function(
  restaurantId: mongoose.Types.ObjectId | string
): Promise<INotionIntegration | null> {
  return this.findOne({ 
    restaurantId: typeof restaurantId === 'string' ? new mongoose.Types.ObjectId(restaurantId) : restaurantId, 
    isActive: true 
  });
};

NotionIntegrationSchema.statics.findByWorkspaceId = async function(
  workspaceId: string
): Promise<INotionIntegration[]> {
  return this.find({ workspaceId, isActive: true });
};

NotionIntegrationSchema.statics.findPendingIntegrations = async function(
  limit: number = 10
): Promise<INotionIntegration[]> {
  return this.find({ 
    syncStatus: 'pending',
    isActive: true 
  })
  .sort({ lastSyncedAt: 1 })
  .limit(limit);
};

const NotionIntegration = mongoose.model<INotionIntegration>(
  'NotionIntegration',
  NotionIntegrationSchema
);

export default NotionIntegration; 