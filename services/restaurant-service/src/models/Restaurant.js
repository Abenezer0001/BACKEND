"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var VenueSchema = new mongoose_1.Schema({
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
var ScheduleSchema = new mongoose_1.Schema({
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
var MenuScheduleSchema = new mongoose_1.Schema({
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
var RestaurantSchema = new mongoose_1.Schema({
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
