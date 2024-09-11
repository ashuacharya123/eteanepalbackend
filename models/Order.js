// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName:{type:String, required: true},
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
      name:{type:String, required: true}
    }
  ],
  total: { type: Number, required: true },
  delivery: { type: Number, default: 0 },  // Default delivery charge
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  address: { type: String, required: true  },
    mobileNumber: { type: Number, required: true  },
  orderedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
