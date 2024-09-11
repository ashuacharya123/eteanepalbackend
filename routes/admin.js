// routes/admin.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth'); // Middleware to check admin role
const User = require("../models/User");
const Notification = require('../models/Notification');
const Order =require('../models/Order');

// Get individual seller report
router.get('/seller-report/:sellerId', auth, adminAuth, async (req, res) => {
    try {
        const { sellerId } = req.params;

        // Get the seller details
        const seller = await User.findById(sellerId);
        if (!seller || seller.role !== 'seller') {
            return res.status(404).json({ message: 'Seller not found' });
        }

        // Get the seller's products
        const products = await Product.find({ seller: sellerId });

        // Get the seller's completed orders
        const orders = await Order.find({
            'items.sellerId': sellerId,
            status: 'Completed'
        });

        // Calculate total sales and number of orders
        const totalSales = orders.reduce((total, order) => total + order.total + order.delivery, 0);
        const numberOfOrders = orders.length;

        // Prepare the report
        const report = {
          seller: {
            name: seller.name,
            email: seller.email,
            panCard: seller.panCard,
            panCardDocument: seller.panCardDocument,
            businessName: seller.businessName,
            businessAddress: seller.businessAddress,
            mobileNumber: seller.mobileNumber,
            verified: seller.verified,
          },
          totalSales,
          numberOfOrders,
          products: products.map((product) => ({
            name: product.name,
            stock: product.stock,
            price: product.price,
            initialPrice: product.initialPrice,
            image: product.image,
            verified: product.verified,
            id: product._id,
          })),
          orders: orders.map((order) => ({
            orderId: order._id,
            total: order.total,
            delivery: order.delivery,
            status: order.status,
            orderedAt: order.orderedAt,
          })),
        };

        res.status(200).json(report);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Route to get pending (unverified) products
router.get('/products/pending', auth, adminAuth, async (req, res) => {
    try {
      const pendingProducts = await Product.find({ verified: false });
      res.json(pendingProducts);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

// Admin dashboard data route
router.get('/dashboard', [auth, adminAuth], async (req, res) => {
    try {
        // Get total sellers
        const totalSellers = await User.countDocuments({ role: 'seller' });

        // Get total buyers
        const totalBuyers = await User.countDocuments({ role: 'buyer' });

        // Get total products
        const totalProducts = await Product.countDocuments();

        // Get total sales from completed orders
        const completedOrders = await Order.find({ status: 'Completed' });

        // Calculate total sales
        const totalSales = completedOrders.reduce((total, order) => total + order.total, 0);

        // Return the counts and total sales to the frontend
        res.json({ totalSellers, totalBuyers, totalProducts, totalSales });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});
// Verify a product
router.put('/verify/product/:id', [auth, adminAuth], async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        product.verified = ! product.verified;
        await product.save();

        // Notify the seller about product verification status
        const seller = await User.findById(product.seller);
        if (seller) {
            const notification = new Notification({
                user: seller._id,
                message: `Your product "${product.name}" has been ${product.verified ? 'verified' : 'unverified'} by the admin.`
            });
            await notification.save();
        }

        res.status(200).json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Fetch all users except admins
router.get('/all-users', auth, async (req, res) => {
    try {
        // Fetch all users except those with the role 'admin'
        const users = await User.find({ role: { $ne: 'admin' } }).select('name email role');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all sellers
router.get('/sellers', [auth, adminAuth], async (req, res) => {
    try {
        const sellers = await User.find({ role: 'seller' }).select('-password');
        res.json(sellers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// Verify a seller
router.put('/verify/seller/:id', [auth, adminAuth], async (req, res) => {
    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'No Seller found' });
        }

        user.verified = ! user.verified;
        await user.save();
        // Notify the seller about their verification status
        const notification = new Notification({
            user: user._id,
            message: `Your seller account has been ${user.verified ? 'verified' : 'unverified'} by the admin.`
        });
        await notification.save();

        res.status(200).json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// Change Role to admin
router.put('/make-admin/:userId', [auth, adminAuth], async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.role = "admin";
        await user.save();

        res.status(200).json({ message: 'User role updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Delete a user
router.delete('/delete-user/:userId', [auth, adminAuth], async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await user.deleteOne({_id:req.params.userId});

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

module.exports = router;
