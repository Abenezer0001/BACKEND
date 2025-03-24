"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var TableSchema = new mongoose_1.Schema({
    number: {
        type: String,
        required: true
    },
    venueId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        ref: 'Venue'
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    type: {
        type: String,
        required: true,
        enum: ['REGULAR', 'VIP', 'COUNTER', 'LOUNGE']
    },
    qrCode: {
        type: String,
        sparse: true
    },
    isOccupied: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    menuId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Menu',
        required: false
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('Table', TableSchema);
