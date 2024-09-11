// routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
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


// Get all verified products with sorting options
router.get('/', async (req, res) => {
    try {
        const { sort } = req.query;

        // Define sorting options
        let sortOptions = {};
        if (sort === 'price-asc') {
            sortOptions = { price: 1 };
        } else if (sort === 'price-desc') {
            sortOptions = { price: -1 };
        } else if (sort === 'rating-asc') {
            sortOptions = { rating: 1 };
        } else if (sort === 'rating-desc') {
            sortOptions = { rating: -1 };
        } else if (sort === 'newest') {
            sortOptions = { createdAt: -1 };
        } else if (sort === 'oldest') {
            sortOptions = { createdAt: 1 };
        }

        // Fetch only verified products with sorting
        const products = await Product.find({ verified: true }).sort(sortOptions);
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.json(product);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update an existing product (for sellers and admins)
router.put('/:id', auth, uploadFields, async (req, res) => {
    const { id } = req.params; // Product ID
    const { name, description, price, stock, initialPrice } = req.body;

    try {
        // Find the product to be updated
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // Ensure user is authorized (seller or admin)
        const requestedUser = await User.findById(req.user.id);
        if (requestedUser.role !== 'seller' && requestedUser.role !== 'admin') {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Check if the product belongs to the seller (only if the user is a seller)
        if (requestedUser.role === 'seller' && product.seller.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Check if a new product image is uploaded
        if (req.files && req.files.productImage && req.files.productImage[0]) {
            const newImage = req.files.productImage[0].filename;

            // Remove the old image file if it exists
            if (product.image) {
                const oldImagePath = path.join(__dirname, '../public', product.image);
                fs.unlink(oldImagePath, (err) => {
                    if (err) {
                        console.error('Error removing old image:', err.message);
                    }
                });
            }

            // Update the product image
            product.image = newImage;
        }

        // Update the other fields
        if (name) product.name = name;
        if (description) product.description = description;
        if (price) product.price = price;
        if (initialPrice) product.initialPrice = initialPrice;
        if (stock) product.stock = stock;

        await product.save();

        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// Delete a product
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // Ensure user owns the product
        if (product.seller.toString() !== req.user.id) {
            const user = await User.findById(req.user.id).select('-password');
            if(user.role != "admin")// admin can also make change
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await Product.deleteOne({_id:req.params.id});

        res.json({ msg: 'Product removed' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});




module.exports = router;
