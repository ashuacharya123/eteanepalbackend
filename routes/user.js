// routes/users.js
const auth = require('../middleware/auth');
const path = require('path');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Product = require('../models/Product');
const multer = require('multer');
const fs = require('fs');



// Set up multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public'));  // Adjust the path as needed
    },
    filename: function (req, file, cb) {
        let str = file.originalname.replace(/\s+/g, '');// Remove space between file name
        cb(null, `${req.user.id}-${Date.now()}-${str}`);
    }
});

const upload = multer({ storage: storage });

// Accept multiple fields if needed
const uploadFields = upload.fields([{ name: 'panCardDocument', maxCount: 1 },
    { name: 'avatar', maxCount: 1 }, ]);




// Update the rating of a product
router.put('/product/rating', auth, async (req, res) => {
    try {
        const { productId, newRating } = req.body;

        // Validate the new rating
        if (newRating < 1 || newRating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Check if user is a buyer
        const user = await User.findById(req.user.id).select('-password');
        if (user.role !== 'buyer') {
            return res.status(403).json({ message: 'Unauthorized: Only buyers can rate products' });
        }

        // Check if the user has already rated this product
        if (user.ratedProducts.includes(productId)) {
            return res.status(400).json({ message: 'You have already rated this product' });
        }

        // Find the product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Calculate the new rating
        const totalRatings = product.rating * product.ratingCount;
        const updatedRatingCount = product.ratingCount + 1;
        const updatedRating = (totalRatings + newRating) / updatedRatingCount;

        // Update the product with the new rating and rating count
        product.rating = updatedRating;
        product.ratingCount = updatedRatingCount;
        
        // Save the updated product
        await product.save();
        
        // Update the user to record that they have rated this product and the rating value
        user.ratedProducts.push({ productId, rating: newRating });
        await user.save();
        

        res.status(200).json({
            message: 'Product rating updated successfully',
            ratedProducts: user.ratedProducts,
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});


// @route    GET api/users/me
// @desc     Get current user's details
// @access   Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    PUT api/users/me
// @desc     Update current user's details
// @access   Private
router.put('/me', auth, uploadFields, async (req, res) => {
    const {
        name,
        email,
        role,
        panCard,
        businessName,
        businessAddress,
        mobileNumber,
        address
    } = req.body;

    const userFields = {};

    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (role) userFields.role = role;
    if (panCard) userFields.panCard = panCard;
    if (businessName) userFields.businessName = businessName;
    if (businessAddress) userFields.businessAddress = businessAddress;
    if (mobileNumber) userFields.mobileNumber = mobileNumber;
    if (address) userFields.address = address;

    try {
        let user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Handle file uploads
        if (req.files) {
            if (req.files.panCardDocument) {
                // Delete the old PAN card document if it exists
                if (user.panCardDocument) {
                    const oldPanCardPath = path.join(__dirname, '../public/', user.panCardDocument);
                    if (fs.existsSync(oldPanCardPath)) {
                        fs.unlinkSync(oldPanCardPath);
                    }
                }
                // Save the new PAN card document
                userFields.panCardDocument = req.files.panCardDocument[0].filename;
            }

            if (req.files.avatar) {
                // Delete the old avatar if it exists
                if (user.avatar) {
                    const oldAvatarPath = path.join(__dirname, '../public/', user.avatar);
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);
                    }
                }
                // Save the new avatar
                userFields.avatar = req.files.avatar[0].filename;
            }
        }

        // Update the user's details
        user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: userFields },
            { new: true }
        );

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    PUT api/users/change-password
// @desc     Change user's password
// @access   Private
router.put('/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        let user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({ msg: 'Password changed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    DELETE api/user/me
// @desc     Delete current user's account
// @access   Private
router.delete('/me', auth, async (req, res) => {
    try {
        // Assuming the password is sent in the request body
        const { password } = req.body;
        if(!password) { return res.status(401).json({ msg: 'Password is required' });}

        // Find the user by the authenticated user's ID
        const user = await User.findById(req.user.id);

        // Check if the user exists
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Verify the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Password incorrect' });
        }

        // Delete the user
        await User.deleteOne({ _id: req.user.id });

        res.json({ msg: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
