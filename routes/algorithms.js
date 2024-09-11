const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const TopProducts = require('../models/TopProducts');
const Subscriber = require('../models/Subscriber');
const sendEmail = require('./email');


// Assign weights
const ratingWeight = 0.5; // Adjusted for balance
const priceWeight = 0.3;
const ratingCountWeight = 0.2; // New weight for ratingCount

// Function to calculate weighted score
function calculateWeightedScore(rating=0, price, maxPrice, ratingCount) {
    const ratingPercentage = (rating / 5) * 100;
    const pricePercentage = ((maxPrice - price) / maxPrice) * 100;
    const ratingCountPercentage = (ratingCount / 100) * 100; // Assume 100 is a max rating count for scaling

    const weightedRatingScore = ratingPercentage * ratingWeight;
    const weightedPriceScore = pricePercentage * priceWeight;
    const weightedRatingCountScore = ratingCountPercentage * ratingCountWeight;

    return weightedRatingScore + weightedPriceScore + weightedRatingCountScore;
}

// Route to calculate and compare products based on IDs
router.get('/compare-products', async (req, res) => {
    try {
        // Extract product IDs from query parameters
        const { ids } = req.query;
        if (!ids) {
            return res.status(400).send('Please provide product IDs');
        }

        // Convert the comma-separated string of IDs into an array
        const productIds = ids.split(',');

        // Fetch products from the database
        const products = await Product.find({ '_id': { $in: productIds } });

        if (products.length === 0) {
            return res.status(404).send('No products found');
        }

        // Find the maximum price among the fetched products
        const maxPrice = Math.max(...products.map(product => product.price));

        // Calculate weighted scores for each product
        const scoredProducts = products.map(product => {
            const score = calculateWeightedScore(product.rating, product.price, maxPrice, product.ratingCount);
            return { ...product.toObject(), score };
        });

        // Sort products by score in descending order
        const sortedProducts = scoredProducts.sort((a, b) => b.score - a.score);

        // Return the sorted products
        res.send(sortedProducts);
    } catch (error) {
        res.status(500).send('An error occurred while comparing products');
    }
});



// Route to calculate and list top 10 products
router.get('/top-products', async (req, res) => {
    try {
        // Fetch all verified products from the database
        const products = await Product.find({ verified: true });

        if (products.length === 0) {
            return res.status(404).send('No products found');
        }

        // Find the maximum price among the verified products
        const maxPrice = Math.max(...products.map(product => product.price));

        // Calculate weighted scores for each product
        const scoredProducts = products.map(product => {
            const score = calculateWeightedScore(product.rating, product.price, maxPrice, product.ratingCount);
            return { ...product.toObject(), score };
        });

        // Sort products by score in descending order and get the top 10
        const newTopProducts = scoredProducts.sort((a, b) => b.score - a.score).slice(0, 10);

        // Fetch the previously stored top 10 products
        const previousTopProducts = await TopProducts.findOne().sort({ createdAt: -1 });

        let isChanged = false;

        if (previousTopProducts) {
            // Compare the new top 10 products with the previous top 10 products
            isChanged = previousTopProducts.products.some((product, index) => {
                return product.productId.toString() !== newTopProducts[index]._id.toString() ||
                    product.score !== newTopProducts[index].score;
            });
        } else {
            // If there is no previous top 10, set isChanged to true to save the new list
            isChanged = true;
        }

        if (isChanged) {
            // Delete all previous top products
            await TopProducts.deleteMany({});

            // Save the new top 10 products list
            await TopProducts.create({
                products: newTopProducts.map(product => ({
                    productId: product._id,
                    score: product.score
                }))
            });

            // Fetch all subscribers whose subscribed status is true
            const subscribers = await Subscriber.find({ subscribed: true });

            // Send email notifications to subscribers
            subscribers.forEach(subscriber => {
                sendEmail(
                    subscriber.email,
                    'Top 10 Products Changed',
                    'The top 10 products list has changed. Please visit the page to grab this opportunity.'
                );
            });
        }

        // Return the top 10 products
        res.send(newTopProducts);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching products');
    }
});





// Implementing Boyer-Moore Algorithm for search
function boyerMooreSearch(text, pattern) {
    const m = pattern.length;
    const n = text.length;
    const badChar = Array(256).fill(-1);

    for (let i = 0; i < m; i++) {
        badChar[pattern.charCodeAt(i)] = i;
    }

    let s = 0;
    while (s <= (n - m)) {
        let j = m - 1;
        while (j >= 0 && pattern[j] === text[s + j]) {
            j--;
        }
        if (j < 0) {
            return s;
        } else {
            s += Math.max(1, j - badChar[text.charCodeAt(s + j)]);
        }
    }
    return -1;
}

router.get('/search', async (req, res) => {
    const { query } = req.query;
    try {
        // Fetch only verified products
        const products = await Product.find({ verified: true });

        // Filter products based on search query
        const matchedProducts = products.filter(product => 
            boyerMooreSearch(product.description.toLowerCase(), query.toLowerCase()) !== -1 || 
            boyerMooreSearch(product.name.toLowerCase(), query.toLowerCase()) !== -1
        );

        res.json(matchedProducts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;