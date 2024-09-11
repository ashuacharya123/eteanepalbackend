const mongoose = require('mongoose');

// Define the cart item schema
const cartItemSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId, // To store item ID
  name: String,                       // Item name
  description: String,                // Item description
  price: Number,                      // Item price
  initialPrice: Number,               // Initial price
  stock: Number,                      // Stock available
  image: String,                      // URL or path to the image
  seller: mongoose.Schema.Types.ObjectId, // Seller ID
  verified: Boolean,                  // Whether the item is verified
  ratingCount: Number,                // Rating count
  createdAt: Date,                    // Date when the item was created
  quantity: Number                    // Quantity of the item in the cart
});

// Define the cart schema
const cartSchema = new mongoose.Schema({
  items: [cartItemSchema],            // Array of cart items
  totalQuantity: Number,              // Total quantity of items in the cart
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true                     // User who owns the cart
  }
});

// Export the Cart model
module.exports = mongoose.model('Cart', cartSchema);
