// routes/orders.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const auth = require("../middleware/auth");
const Product = require("../models/Product");
const Notification = require("../models/Notification");

// Create an order
// Create an order
router.post("/", auth, async (req, res) => {
  try {
    const { items, total, delivery, address, mobileNumber, buyerName } =
      req.body;
    const userId = req.user.id;

    // Create a new order
    const newOrder = new Order({
      user: userId,
      items,
      total,
      delivery,
      address,
      mobileNumber,
      buyerName,
    });

    // Save the order first
    await newOrder.save();

    // Now update the stock of the ordered products
    const sellersNotified = new Set(); // To avoid notifying the same seller multiple times

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res
          .status(404)
          .json({ error: `Product with id ${item.product} not found` });
      }

      // Decrease the stock by the quantity ordered
      product.stock -= item.quantity;

      // Ensure stock doesn't go below zero
      if (product.stock < 0) {
        product.stock = 0;
      }

      await product.save();

      // Notify the seller if not already notified
      if (product.seller && !sellersNotified.has(product.seller)) {
        console.log(product.seller);
        if (product.seller) {
          const notification = new Notification({
            user: product.seller,
            message: `You have a new order for product "${product.name}" by ${buyerName}.`,
          });
          await notification.save();

          sellersNotified.add(product.seller);
        }
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});



// Get orders for the logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get orders for the seller, sorted by latest order first
router.get("/seller", auth, async (req, res) => {
  try {
    // Find orders where any item in the items array has the sellerId matching the authenticated user's ID
    const orders = await Order.find({
      "items.sellerId": req.user.id,
    }).sort({ createdAt: -1 }); // Sort by latest order first

    // Send the orders as a response
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});


// Update order status
router.put('/:orderId/status', auth, async (req, res) => {
  try {
      const { orderId } = req.params;
      const { status } = req.body;

      // Ensure the status is either 'Pending' or 'Completed'
      if (status !== 'Pending' && status !== 'Completed') {
          return res.status(400).json({ message: 'Invalid status value' });
      }

      // Find the order
      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
      }

      // Ensure the user is the seller of the order's items
      const isSeller = order.items.some(item => item.sellerId.toString() === req.user.id);
      if (!isSeller) {
          return res.status(403).json({ message: 'Unauthorized: You are not the seller of this order' });
      }

      // Update the order status
      order.status = status;
      await order.save();

      res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
