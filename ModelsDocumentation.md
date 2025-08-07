# Backend Models Documentation

This document provides a comprehensive overview of all models used across different services in the INSEAT Backend. Each service's models are documented with their interfaces, schemas, methods, and relationships with other models.

## Table of Contents
- [Auth Service](#auth-service)
- [Restaurant Service](#restaurant-service)
- [Order Service](#order-service)
- [Payment Service](#payment-service)
- [Notification Service](#notification-service)

## Auth Service

The Auth Service handles user authentication, authorization, and role-based access control (RBAC).

### User.ts

Interface definition:
```typescript
interface IUser extends Document {
  email: string;
  password: string;
  roles: mongoose.Types.ObjectId[];
  permissions: mongoose.Types.ObjectId[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}
```

Schema:
```typescript
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
```

Special Methods:
- `comparePassword(candidatePassword: string)`: Compares a candidate password with the stored hashed password
- Pre-save hook for password hashing

Indexes:
- Compound index on email field

Relationships:
- Many-to-many relationship with Role model through roles array
- Many-to-many relationship with Permission model through permissions array

### role.model.ts

Interface definition:
```typescript
export interface IRole extends Document {
  name: string;
  description: string;
  permissions: IPermission[] | string[];
  createdAt: Date;
  updatedAt: Date;
}
```

Schema:
```typescript
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
```

Indexes:
- Index on name field

Relationships:
- Many-to-many relationship with Permission model through permissions array
- Referenced by User model

### permission.model.ts

Interface definition:
```typescript
export interface IPermission extends Document {
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Schema:
```typescript
const PermissionSchema = new Schema<IPermission>(
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
    }
  },
  {
    timestamps: true
  }
);
```

Relationships:
- Referenced by Role model
- Referenced by User model directly (for specific permissions)

## Restaurant Service

The Restaurant Service manages restaurant-related data including venues, tables, menus, and categories.

### Restaurant.ts

The Restaurant model includes several embedded schemas:

Venue Schema:
```typescript
export interface IVenue extends Document {
  name: string;
  description?: string;
  capacity: number;
  isActive: boolean;
}

const VenueSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
});
```

Schedule Schema:
```typescript
export interface ISchedule extends Document {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isHoliday: boolean;
}

const ScheduleSchema: Schema = new Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  openTime: {
    type: String,
    required: true
  },
  closeTime: {
    type: String,
    required: true
  },
  isHoliday: {
    type: Boolean,
    default: false
  }
});
```

Menu Schedule Schema:
```typescript
export interface IMenuSchedule extends Document {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isAvailable: boolean;
}

const MenuScheduleSchema: Schema = new Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  openTime: {
    type: String,
    required: true
  },
  closeTime: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
});
```

Restaurant Interface and Schema:
```typescript
export interface IRestaurant extends Document {
  name: string;
  locations: Array<{
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
  venues: mongoose.Types.ObjectId[];
  tables: mongoose.Types.ObjectId[];
  menu: Array<{
    category: string;
    items: Array<{
      name: string;
      description: string;
      price: number;
      modifiers: Array<{
        name: string;
        options: string[];
        price: number;
      }>;
      isAvailable: boolean;
      schedule: IMenuSchedule[];
    }>;
  }>;
  adminIds: string[];
  schedule: ISchedule[];
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantSchema: Schema = new Schema({
  name: { type: String, required: true },
  locations: [{
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  }],
  venues: { type: [Schema.Types.ObjectId], ref: 'Venue', default: [] },
  tables: { type: [Schema.Types.ObjectId], ref: 'Table', default: [] },
  menu: [{
    category: { type: String, required: true },
    items: [{
      name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true },
      modifiers: [{
        name: { type: String, required: true },
        options: [{ type: String }],
        price: { type: Number, required: true }
      }],
      isAvailable: { type: Boolean, default: true },
      schedule: [MenuScheduleSchema]
    }]
  }],
  schedule: [ScheduleSchema],
  adminIds: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});
```

Relationships:
- One-to-many relationship with Venue model
- One-to-many relationship with Table model
- Referenced by various models (Category, MenuItem, etc.)
- Many-to-many relationship with User model through adminIds

### Category.ts

Interface definition:
```typescript
export interface ICategory extends Document {
  name: string;
  description: string;
  image?: string;
  restaurantId: Types.ObjectId;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Schema:
```typescript
const CategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  }
}, {
  timestamps: true
});
```

Relationships:
- Many-to-one relationship with Restaurant model
- Referenced by Menu items

### TableType.ts

Interface definition:
```typescript
export interface ITableType extends Document {
  name: string;
  description?: string;
  restaurantId: mongoose.Schema.Types.ObjectId;
}
```

Schema:
```typescript
const TableTypeSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
}, {
  timestamps: true,
});
```

Relationships:
- Many-to-one relationship with Restaurant model
- Referenced by Table model

### Table.ts

Interface definition:
```typescript
export interface ITable extends Document {
  name: string;
  number: string;
  capacity: number;
  restaurantId: mongoose.Schema.Types.ObjectId;
  venueId: mongoose.Schema.Types.ObjectId;

  tableTypeId: mongoose.Schema.Types.ObjectId;
  isAvailable: boolean;
  isActive: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Schema:
```typescript
const TableSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  number: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  venueId: {
    type: Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
 

  tableTypeId: {
    type: Schema.Types.ObjectId,
    ref: 'TableType',
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
```

Relationships:
- Many-to-one relationship with Restaurant model
- Many-to-one relationship with Venue model

- Many-to-one relationship with TableType model
- Referenced by Order model

### Menu.ts

Interface definition:
```typescript
export interface IMenu extends Document {
  name: string;
  description?: string;
  restaurantId: Types.ObjectId;
  venueId: Types.ObjectId;
  categories: Types.ObjectId[];
  subCategories: Types.ObjectId[];
}
```

Schema:
```typescript
const MenuSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category', default: [] }],
  subCategories: [{ type: Schema.Types.ObjectId, ref: 'SubCategory', default: [] }]
}, { 
  timestamps: true 
});
```

Relationships:
- Many-to-one relationship with Restaurant model
- Many-to-one relationship with Venue model
- Many-to-many relationship with Category model
- Many-to-many relationship with SubCategory model

### MenuItem.ts

Interface definition:
```typescript
export interface IMenuItem extends Document {
  name: string;
  description: string;
  venueId: IVenue['_id'];
  categories: Types.ObjectId[];
  subCategories: Types.ObjectId[];
  subSubCategory?: Types.ObjectId | null;
  price: number;
  modifierGroups?: IModifier[];
  image?: string;
  preparationTime: number;
  isAvailable: boolean;
  isActive: boolean;
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fats?: number;
  };
  restaurantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

Schema:
```typescript
const MenuItemSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  venueId: {
    type: Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true
  },
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  subCategories: [{
    type: Schema.Types.ObjectId,
    ref: 'SubCategory'
  }],
  subSubCategory: {
    type: Schema.Types.ObjectId,
    ref: 'SubSubCategory',
    required: false,
    default: null
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  modifierGroups: [{
    type: Schema.Types.ObjectId,
    ref: 'Modifier'
  }],
  image: {
    type: String,
    trim: true
  },
  preparationTime: {
    type: Number,
    required: true,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allergens: {
    type: [String],
    default: []
  },
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fats: Number
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  }
}, {
  timestamps: true
});
```

Special features:
- Indexes on `restaurantId` and `venueId` for faster queries
- Comprehensive nutritional information tracking
- Support for allergen information
- Soft delete functionality via `isActive` flag

Relationships:
- Many-to-one relationship with Restaurant model
- Many-to-one relationship with Venue model
- Many-to-many relationship with Category model
- Many-to-many relationship with SubCategory model
- Optional relationship with SubSubCategory model
- Many-to-many relationship with Modifier model

### Modifier.ts

Interface definitions:
```typescript
interface IModifierOption {
  name: string;
  price?: number;
  isAvailable: boolean;
  order?: number;
}

export interface IModifier extends Document {
  name: string;
  description?: string;
  restaurantId: mongoose.Schema.Types.ObjectId;
  options: IModifierOption[];
  isRequired: boolean;
  multiSelect: boolean;
  minSelect?: number;
  maxSelect?: number;
  isActive: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Schemas:
```typescript
const ModifierOptionSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    min: 0,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
});

const ModifierSchema: Schema = new Schema({
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
    required: true
  },
  options: [ModifierOptionSchema],
  isRequired: {
    type: Boolean,
    default: false
  },
  multiSelect: {
    type: Boolean,
    default: false
  },
  minSelect: {
    type: Number,
    min: 0
  },
  maxSelect: {
    type: Number,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
```

Relationships:
- Many-to-one relationship with Restaurant model
- Referenced by MenuItem model

### SubCategory.ts

Interface definition:
```typescript
export interface ISubCategory extends Document {
  name: string;
  description?: string;
  image?: string;
  restaurantId: mongoose.Schema.Types.ObjectId;
  categoryId: mongoose.Schema.Types.ObjectId;
  isActive: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Schema:
```typescript
const SubCategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
```

Relationships:
- Many-to-one relationship with Restaurant model
- Many-to-one relationship with Category model
- Referenced by Menu model
- Referenced by MenuItem model
- One-to-many relationship with SubSubCategory model

### SubSubCategory.ts

Interface definition:
```typescript
export interface ISubSubCategory extends Document {
  name: string;
  description?: string;
  image?: string;
  restaurantId: mongoose.Schema.Types.ObjectId;
  categoryId: mongoose.Schema.Types.ObjectId;
  subCategoryId: mongoose.Schema.Types.ObjectId;
  isActive: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Schema:
```typescript
const SubSubCategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategoryId: {
    type: Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
```

Relationships:
- Many-to-one relationship with Restaurant model
- Many-to-one relationship with Category model
- Many-to-one relationship with SubCategory model
- Referenced by MenuItem model

### Venue.ts

Interface definition:
```typescript
export interface IVenue extends Document {
  name: string;
  description?: string;
  capacity: number;
  isActive: boolean;
  restaurantId: mongoose.Types.ObjectId;
}
```

Schema:
```typescript
const VenueSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Restaurant'
  }
}, {
  timestamps: true
});
```

Relationships:
- Many-to-one relationship with Restaurant model

- One-to-many relationship with Menu model
- One-to-many relationship with MenuItem model

## Order Service

### Order.ts

Interface definition (inferred):
```typescript
export interface IOrder extends Document {
  restaurantId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  items: Array<{
    menuItemId: mongoose.Schema.Types.ObjectId;
    quantity: number;
    price: number;
    modifiers: Array<{
      modifierId: mongoose.Schema.Types.ObjectId;
      options: string[];
      price: number;
    }>;
  }>;
  status: string;
  tableId: mongoose.Schema.Types.ObjectId;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Relationships:
- Many-to-one relationship with Restaurant model
- Many-to-one relationship with User model
- Many-to-one relationship with Table model
- References to MenuItem and Modifier models in the items array

## Payment Service

### payment.model.ts

Interface definition (inferred):
```typescript
export interface IPayment extends Document {
  orderId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Relationships:
- One-to-one relationship with Order model
- Many-to-one relationship with User model

## Notification Service

### notification.model.ts

Interface definition (inferred):
```typescript
export interface INotification extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Relationships:
- Many-to-one relationship with User model
- May contain references to Order, Payment, or other models in the data field

## Conclusion

This documentation provides an overview of all models across the different services in the INSEAT Backend. The models are structured with clear relationships between them, facilitating a cohesive data ecosystem. Key relationships include:

1. **User-Role-Permission** relationships for access control
2. **Restaurant-centered** hierarchy with venues, tables, menu items, etc.
3. **Order-Payment** flow with connections to restaurants and users
4. **Notification system** linked to users and relevant business events

This document should be updated as new models are added or existing ones are modified to maintain an accurate representation of the system's data model.

