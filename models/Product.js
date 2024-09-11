// models/Product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    initialPrice :{ type: Number},
    stock: { type: Number, required: true },
    image: { type: String },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    verified: { type: Boolean, default: false },
    rating: { 
        type: Number,
        validate: {
            validator: (value) => value >= 1 && value <= 5,
            message: 'Rating must be between 1 and 5'
        }
    },
    ratingCount: { type: Number, default: 0 }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);
