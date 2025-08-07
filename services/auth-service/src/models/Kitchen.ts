import mongoose, { Schema, Document } from 'mongoose';

export interface IKitchen extends Document {
  name: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId;
  venueId: mongoose.Types.ObjectId;
  // Kitchen status and configuration
  isActive: boolean;
  hasKDS: boolean; // Kitchen Display System availability
  status: 'OPEN' | 'CLOSED' | 'BUSY' | 'MAINTENANCE';
  // Kitchen staff assignments
  assignedStaff: mongoose.Types.ObjectId[]; // Kitchen staff user IDs
  maxStaffCapacity: number;
  // Kitchen equipment and printer settings
  equipment: {
    name: string;
    type: 'STOVE' | 'OVEN' | 'GRILL' | 'FRYER' | 'PREP_STATION' | 'OTHER';
    isActive: boolean;
    lastMaintenance?: Date;
  }[];
  printers: {
    kotPrinter?: {
      name: string;
      ipAddress: string;
      port: number;
      isActive: boolean;
    };
    labelPrinter?: {
      name: string;
      ipAddress: string;
      port: number;
      isActive: boolean;
    };
  };
  // Working hours and schedule
  workingHours: {
    dayOfWeek: number; // 0-6 (Sunday to Saturday)
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    isOpen: boolean;
  }[];
  // Performance metrics
  performance: {
    averagePreparationTime: number; // in minutes
    dailyOrdersProcessed: number;
    efficiency: number; // percentage
    lastCalculated: Date;
  };
  // Kitchen type and capabilities
  kitchenType: 'MAIN' | 'PREP' | 'DESSERT' | 'GRILL' | 'HOT' | 'COLD';
  capabilities: string[]; // e.g., ['grilling', 'frying', 'baking', 'prep']
  // Access control
  accessPin?: string; // PIN for KDS access
  createdAt: Date;
  updatedAt: Date;
}

const KitchenSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  venueId: {
    type: Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true
  },
  // Kitchen status and configuration
  isActive: {
    type: Boolean,
    default: true
  },
  hasKDS: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'BUSY', 'MAINTENANCE'],
    default: 'CLOSED'
  },
  // Kitchen staff assignments
  assignedStaff: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxStaffCapacity: {
    type: Number,
    default: 5,
    min: 1
  },
  // Kitchen equipment
  equipment: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['STOVE', 'OVEN', 'GRILL', 'FRYER', 'PREP_STATION', 'OTHER'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastMaintenance: Date
  }],
  // Printer configuration
  printers: {
    kotPrinter: {
      name: String,
      ipAddress: String,
      port: {
        type: Number,
        default: 9100
      },
      isActive: {
        type: Boolean,
        default: false
      }
    },
    labelPrinter: {
      name: String,
      ipAddress: String,
      port: {
        type: Number,
        default: 9100
      },
      isActive: {
        type: Boolean,
        default: false
      }
    }
  },
  // Working hours
  workingHours: [{
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    isOpen: {
      type: Boolean,
      default: true
    }
  }],
  // Performance metrics
  performance: {
    averagePreparationTime: {
      type: Number,
      default: 0
    },
    dailyOrdersProcessed: {
      type: Number,
      default: 0
    },
    efficiency: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    }
  },
  // Kitchen type and capabilities
  kitchenType: {
    type: String,
    enum: ['MAIN', 'PREP', 'DESSERT', 'GRILL', 'HOT', 'COLD'],
    default: 'MAIN'
  },
  capabilities: [{
    type: String,
    trim: true
  }],
  // Access control
  accessPin: {
    type: String,
    minlength: 4,
    maxlength: 8
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
KitchenSchema.index({ restaurantId: 1, venueId: 1 });
KitchenSchema.index({ isActive: 1, status: 1 });
KitchenSchema.index({ assignedStaff: 1 });

// Virtual for full kitchen name
KitchenSchema.virtual('fullName').get(function(this: IKitchen) {
  return `${this.name} - ${this.kitchenType}`;
});

// Method to check if kitchen is currently open
KitchenSchema.methods.isCurrentlyOpen = function(this: IKitchen): boolean {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const todaySchedule = this.workingHours.find(schedule => 
    schedule.dayOfWeek === currentDay && schedule.isOpen
  );
  
  if (!todaySchedule) return false;
  
  return currentTime >= todaySchedule.startTime && currentTime <= todaySchedule.endTime;
};

// Method to get available staff capacity
KitchenSchema.methods.getAvailableCapacity = function(this: IKitchen): number {
  return this.maxStaffCapacity - this.assignedStaff.length;
};

const Kitchen = mongoose.model<IKitchen>('Kitchen', KitchenSchema);
export default Kitchen; 