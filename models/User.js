// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'buyer', required: true },
    panCard: { type: Number },
    panCardDocument: { type: String }, // Store path or URL of the uploaded PAN card document
    businessName: { type: String },
    businessAddress: { type: String },
    address: { type: String },
    mobileNumber: { type: Number },
    verified: { type: Boolean, default: false },
    otp: {
        type: String,
        required: false
    },
    otpExpiry: {
        type: Number,
        required: false
    },
    ratedProducts: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            rating: { type: Number, required: true }
        }
    ],
    avatar: { type: String },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
