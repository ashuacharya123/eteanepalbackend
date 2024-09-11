// Example using Node.js and Express.js
const express = require('express');
const stripe = require('stripe')('sk_test_51PxLIv084b8IR9XHrYzuqikquOy8EzH1vYzTANMmaIudFc5L8oqxGrjqzPJNslLXWMz85MZ9E1hjXQRP6aGwlogv00ayASj46u');  // Replace with your Stripe Secret Key
const router = express.Router();

router.post('/payment-intent', async (req, res) => {
  const { amount, paymentMethodId } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',  // Change to your currency
      payment_method: paymentMethodId,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',  // Disables redirect-based payment methods
      },
      confirm: true,  // Confirm the payment immediately
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
