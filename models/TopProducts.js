const mongoose = require('mongoose');

const TopProductsSchema = new mongoose.Schema({
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            score: {
                type: Number,
                required: true
            }
        }
    ]
}, { timestamps: true });

const TopProducts = mongoose.model('TopProducts', TopProductsSchema);

module.exports = TopProducts;
