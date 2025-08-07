import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  // Schedule identification
  name: string;
  description?: string;
  scheduleType: 'RESTAURANT' | 'MENU_ITEM' | 'KITCHEN' | 'VENUE' | 'CATEGORY' | 'BUSINESS';
  
  // Reference IDs based on schedule type
  restaurantId?: mongoose.Types.ObjectId;
  venueId?: mongoose.Types.ObjectId;
  menuItemId?: mongoose.Types.ObjectId;  
  kitchenId?: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  businessId?: mongoose.Types.ObjectId;
  
  // Schedule configuration
  isActive: boolean;
  priority: number; // Higher number = higher priority
  
  // Time-based scheduling
  schedulePattern: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' | 'ONE_TIME';
  
  // Daily schedule (for restaurants, kitchens, venues)
  dailySchedule?: {
    dayOfWeek: number; // 0-6 (Sunday to Saturday)
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    isOpen: boolean;
    breaks?: {
      startTime: string;
      endTime: string;
      description?: string;
    }[];
  }[];
  
  // Date range for schedule validity
  startDate: Date;
  endDate?: Date; // null means indefinite
  
  // Special dates (holidays, events, etc.)
  exceptions: {
    date: Date;
    isOpen: boolean;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }[];
  
  // Menu item specific scheduling
  menuItemAvailability?: {
    isAvailable: boolean;
    availableQuantity?: number; // null means unlimited
    soldQuantity?: number;
    availabilityMessage?: string;
  };
  
  // Recurring schedule rules
  recurringRules?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number; // every X days/weeks/months
    daysOfWeek?: number[]; // for weekly recurrence
    dayOfMonth?: number; // for monthly recurrence
    endAfter?: number; // number of occurrences
    endDate?: Date;
  };
  
  // Schedule metadata
  timezone: string;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  // Approval workflow
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isCurrentlyActive(): boolean;
  isMenuItemAvailable(): boolean;
  getNextAvailableTime(): Date | null;
}

const ScheduleSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  scheduleType: {
    type: String,
    enum: ['RESTAURANT', 'MENU_ITEM', 'KITCHEN', 'VENUE', 'CATEGORY', 'BUSINESS'],
    required: true,
    index: true
  },
  
  // Reference IDs
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    index: true
  },
  venueId: {
    type: Schema.Types.ObjectId,
    ref: 'Venue',
    index: true
  },
  menuItemId: {
    type: Schema.Types.ObjectId,
    ref: 'MenuItem',
    index: true
  },
  kitchenId: {
    type: Schema.Types.ObjectId,
    ref: 'Kitchen',
    index: true
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  },
  
  // Schedule configuration
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  // Time-based scheduling
  schedulePattern: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM', 'ONE_TIME'],
    required: true
  },
  
  // Daily schedule
  dailySchedule: [{
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
    },
    breaks: [{
      startTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      endTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      description: String
    }]
  }],
  
  // Date range
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    index: true
  },
  
  // Special dates and exceptions
  exceptions: [{
    date: {
      type: Date,
      required: true
    },
    isOpen: {
      type: Boolean,
      required: true
    },
    startTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    reason: String
  }],
  
  // Menu item availability
  menuItemAvailability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    availableQuantity: {
      type: Number,
      min: 0
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    availabilityMessage: String
  },
  
  // Recurring rules
  recurringRules: {
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY']
    },
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    endAfter: {
      type: Number,
      min: 1
    },
    endDate: Date
  },
  
  // Metadata
  timezone: {
    type: String,
    default: 'UTC'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Approval workflow
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'INACTIVE', 'EXPIRED'],
    default: 'DRAFT',
    index: true
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true
});

// Compound indexes for efficient querying
ScheduleSchema.index({ scheduleType: 1, restaurantId: 1, isActive: 1 });
ScheduleSchema.index({ scheduleType: 1, menuItemId: 1, isActive: 1 });
ScheduleSchema.index({ startDate: 1, endDate: 1, status: 1 });
ScheduleSchema.index({ status: 1, isActive: 1 });

// Virtual for schedule duration
ScheduleSchema.virtual('duration').get(function(this: ISchedule) {
  if (!this.endDate) return null;
  return this.endDate.getTime() - this.startDate.getTime();
});

// Method to check if schedule is currently active
ScheduleSchema.methods.isCurrentlyActive = function(this: ISchedule): boolean {
  const nowUTC = new Date();
  
  console.log(`Schedule.isCurrentlyActive() - Schedule: ${this.name}, Type: ${this.scheduleType}`);
  console.log(`Schedule timezone: ${this.timezone}`);
  
  // Convert current time to schedule's timezone
  let scheduleTime: Date;
  let currentDay: number;
  let currentTime: string;
  
  try {
    // Use Intl.DateTimeFormat to get time in schedule's timezone
    const timezone = this.timezone || 'UTC';
    const timeInTimezone = new Date().toLocaleString("en-US", {
      timeZone: timezone,
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
    
    console.log(`Time in schedule timezone (${timezone}): ${timeInTimezone}`);
    
    // Parse the localized time string back to a Date object
    // Format: "MM/DD/YYYY, HH:mm:ss"
    const [datePart, timePart] = timeInTimezone.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    
    scheduleTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                           parseInt(hour), parseInt(minute), parseInt(second));
    
    currentDay = scheduleTime.getDay();
    currentTime = `${scheduleTime.getHours().toString().padStart(2, '0')}:${scheduleTime.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`Converted to schedule timezone - Day: ${currentDay}, Time: ${currentTime}`);
  } catch (error) {
    console.log(`Timezone conversion failed, falling back to server time:`, error);
    scheduleTime = nowUTC;
    currentDay = nowUTC.getDay();
    currentTime = `${nowUTC.getHours().toString().padStart(2, '0')}:${nowUTC.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // Check if schedule is active and within date range
  if (!this.isActive || this.status !== 'ACTIVE') {
    console.log(`Schedule not active or wrong status: isActive=${this.isActive}, status=${this.status}`);
    return false;
  }
  if (scheduleTime < this.startDate) {
    console.log(`Current time before start date: ${scheduleTime} < ${this.startDate}`);
    return false;
  }
  if (this.endDate && scheduleTime > this.endDate) {
    console.log(`Current time after end date: ${scheduleTime} > ${this.endDate}`);
    return false;
  }
  
  // Check daily schedule for current day
  if (this.dailySchedule && this.dailySchedule.length > 0) {
    console.log(`Looking for schedule for day ${currentDay} at time ${currentTime}`);
    
    const todaySchedule = this.dailySchedule.find(schedule => 
      schedule.dayOfWeek === currentDay
    );
    
    if (todaySchedule) {
      console.log(`Found today's schedule: ${JSON.stringify(todaySchedule)}`);
    } else {
      console.log(`No schedule found for day ${currentDay}`);
      console.log(`Available schedules:`, this.dailySchedule.map(s => `Day ${s.dayOfWeek}: ${s.startTime}-${s.endTime} Open:${s.isOpen}`));
    }
    
    // If no schedule found for today, assume closed
    if (!todaySchedule) {
      console.log(`No schedule for today (${currentDay}), returning false`);
      return false;
    }
    
    // If today's schedule says it's closed, return false
    if (!todaySchedule.isOpen) {
      console.log(`Today's schedule shows closed (isOpen: ${todaySchedule.isOpen}), returning false`);
      return false;
    }
    
    // Check if current time is within schedule
    // Convert current time to minutes for proper comparison
    const currentMinutes = parseInt(currentTime.substring(0, 2)) * 60 + parseInt(currentTime.substring(3, 5));
    
    // Special handling for 24-hour operations (00:00-00:00)
    const is24HourOperation = todaySchedule.startTime === '00:00' && todaySchedule.endTime === '00:00';
    
    if (is24HourOperation) {
      console.log(`24-hour operation detected (${todaySchedule.startTime}-${todaySchedule.endTime}), always open`);
    } else {
      // Normal time range checking
      const startMinutes = parseInt(todaySchedule.startTime.substring(0, 2)) * 60 + parseInt(todaySchedule.startTime.substring(3, 5));
      const endMinutes = parseInt(todaySchedule.endTime.substring(0, 2)) * 60 + parseInt(todaySchedule.endTime.substring(3, 5));
      
      console.log(`Time comparison - Current: ${currentTime} (${currentMinutes}min), Range: ${todaySchedule.startTime} (${startMinutes}min) - ${todaySchedule.endTime} (${endMinutes}min)`);
      
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        console.log(`Current time ${currentTime} not within ${todaySchedule.startTime}-${todaySchedule.endTime}, returning false`);
        return false;
      }
    }
    
    // Check if current time is during a break
    if (todaySchedule.breaks) {
      const isInBreak = todaySchedule.breaks.some(breakTime => {
        const breakStartMinutes = parseInt(breakTime.startTime.substring(0, 2)) * 60 + parseInt(breakTime.startTime.substring(3, 5));
        const breakEndMinutes = parseInt(breakTime.endTime.substring(0, 2)) * 60 + parseInt(breakTime.endTime.substring(3, 5));
        return currentMinutes >= breakStartMinutes && currentMinutes <= breakEndMinutes;
      });
      if (isInBreak) {
        console.log(`Current time is during a break, returning false`);
        return false;
      }
    }
    
    console.log(`All checks passed, restaurant/venue is open`);
  }
  
  // Check exceptions for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayException = this.exceptions.find(exception => {
    const exceptionDate = new Date(exception.date);
    exceptionDate.setHours(0, 0, 0, 0);
    return exceptionDate.getTime() === today.getTime();
  });
  
  if (todayException) {
    return todayException.isOpen;
  }
  
  return true;
};

// Method to get next available time
ScheduleSchema.methods.getNextAvailableTime = function(this: ISchedule): Date | null {
  // Implementation for finding next available time slot
  // This would be more complex and could be added later
  return null;
};

// Method to check if menu item is available
ScheduleSchema.methods.isMenuItemAvailable = function(this: ISchedule): boolean {
  if (this.scheduleType !== 'MENU_ITEM' || !this.menuItemAvailability) return true;
  
  if (!this.menuItemAvailability.isAvailable) return false;
  
  // Check quantity availability
  if (this.menuItemAvailability.availableQuantity !== null && 
      this.menuItemAvailability.availableQuantity !== undefined) {
    const soldQuantity = this.menuItemAvailability.soldQuantity || 0;
    return soldQuantity < this.menuItemAvailability.availableQuantity;
  }
  
  return true;
};

const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);
export default Schedule; 