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
const VenueSchema = new mongoose_1.Schema({
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
const ScheduleSchema = new mongoose_1.Schema({
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
const MenuScheduleSchema = new mongoose_1.Schema({
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
const RestaurantSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    locations: [{
            address: { type: String, required: true },
            coordinates: {
                latitude: { type: Number, required: true },
                longitude: { type: Number, required: true }
            }
        }],
    venues: { type: [mongoose_1.Schema.Types.ObjectId], ref: 'Venue', default: [] },
    tables: { type: [mongoose_1.Schema.Types.ObjectId], ref: 'Table', default: [] },
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
    adminIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('Restaurant', RestaurantSchema);
