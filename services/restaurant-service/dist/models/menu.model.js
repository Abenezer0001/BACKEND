"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ModifierOptionSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
});
const ModifierGroupSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    required: {
        type: Boolean,
        default: false
    },
    multiSelect: {
        type: Boolean,
        default: false
    },
    minSelect: {
        type: Number,
        min: 0,
        default: 0
    },
    maxSelect: {
        type: Number,
        min: 0,
        validate: {
            validator: function (value) {
                return !this.minSelect || value >= this.minSelect;
            },
            message: 'maxSelect must be greater than or equal to minSelect'
        }
    },
    options: [ModifierOptionSchema]
});
const MenuItemSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    modifierGroups: [ModifierGroupSchema],
    image: String,
    preparationTime: {
        type: Number,
        required: true,
        min: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    allergens: [String],
    nutritionalInfo: {
        calories: Number,
        protein: Number,
        carbohydrates: Number,
        fats: Number
    }
});
const MenuCategorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    categories: [String],
    items: [MenuItemSchema],
    isAvailable: {
        type: Boolean,
        default: true
    },
    availabilitySchedule: {
        startTime: String,
        endTime: String,
        daysOfWeek: [Number]
    }
});
const MenuSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Restaurant'
    },
    categories: [MenuCategorySchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('Menu', MenuSchema);
