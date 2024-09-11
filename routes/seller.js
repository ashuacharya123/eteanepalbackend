const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('./email');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Set up multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Check if the file field is 'productImage'
        if (file.fieldname === 'productImage') {
            cb(null, path.join(__dirname, '../public')); // Destination for product images
        } else {
            cb(null, path.join(__dirname, '../public')); // Default destination
        }
    },
    filename: function (req, file, cb) {
        let str = file.originalname.replace(/\s+/g, ''); // Remove spaces between file names
        cb(null, `${Date.now()}-${str}`);
    }
});

const upload = multer({ storage: storage });

// Accept multiple fields if needed
const uploadFields = upload.fields([
    { name: 'panCardDocument', maxCount: 1 },
    { name: 'productImage', maxCount: 1 } // Add support for product image
]);

// Register a new seller
router.post('/register', uploadFields, async (req, res) => {
    const { name, email, password, businessName, businessAddress, panCard, mobileNumber } = req.body;

    try {
        // Check if all required fields are present
        if (!name || !email || !password || !businessName || !businessAddress || !panCard || !mobileNumber) {
            return res.status(400).json({ msg: 'All fields are required' });
        }

        // Check if the PAN card document file is uploaded
        if (!req.files || !req.files.panCardDocument || !req.files.panCardDocument[0]) {
            return res.status(400).json({ msg: 'PAN card document is required' });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Seller already exists' });
        }

        // Handle file uploads
        // Save the new PAN card document
        const panCardDocument = req.files.panCardDocument[0].filename;

        const newUser = new User({
            name,
            email,
            password,
            role: 'seller',
            panCard,
            panCardDocument,
            businessName,
            businessAddress,
            mobileNumber
        });

        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        newUser.otp = await bcrypt.hash(otp, salt);

        const date = new Date(Date.now() + 600000); // 10 minutes from now
        newUser.otpExpiry = date.getTime();

        await newUser.save();

        // Notify admin
        const admin = await User.findOne({ role: 'admin' });
        const notification = new Notification({
            user: admin._id,
            message: `A new seller has registered: ${name}, ${email}.`
        });
        await notification.save();

        sendEmail(email, "OTP verification", `Your OTP is ${otp}`);

        res.status(200).json({ msg: 'OTP sent to email' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Seller dashboard
router.get('/dashboard', auth, async (req, res) => {
    try {
        const sellerId = req.user.id;

        // Get the total number of products listed by the seller
        const totalProducts = await Product.countDocuments({ seller: sellerId });

        // Get the total sales for the seller from completed orders
        const orders = await Order.find({
            'items.sellerId': sellerId,  // Ensure we're only looking at orders with this seller's products
            status: 'Completed'          // Filter to include only completed orders
        });

        // Calculate total sales
        const totalSales = orders.reduce((total, order) => total + order.total, 0);

        // Get the list of products with their details
        const products = await Product.find({ seller: sellerId });

        res.status(200).json({
            totalProducts,
            totalSales,
            products: products.map(product => ({
                name: product.name,
                description: product.description,
                stock: product.stock,
                finalPrice: product.price,
                initialPrice: product.initialPrice,
                image: product.image,
                id: product._id
            }))
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});



// Add a new product (only for verified sellers)
router.post('/product', auth, uploadFields, async (req, res) => {
    const { name, description, price, stock, initialPrice } = req.body;

    try {
        // Ensure user is a verified seller
        const user = await User.findById(req.user.id);
        if (user.role !== 'seller' || !user.verified) {
            return res.status(401).json({ msg: 'User not authorized or not verified' });
        }

        // Check if the product image file is uploaded
        const productImage = req.files?.productImage?.[0]?.filename || null;

        const newProduct = new Product({
            name,
            description,
            price,
            initialPrice,
            stock,
            image: productImage,
            seller: req.user.id,
            verified: false // initially not verified
        });
        await newProduct.save();

        // Notify admin
        const admin = await User.findOne({ role: 'admin' });
        const notification = new Notification({
            user: admin._id,
            message: `A new product has been listed: ${name}. Please verify.`
        });
        await notification.save();

        res.json(newProduct);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


module.exports = router;
