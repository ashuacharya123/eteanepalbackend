const express = require('express');
const axios = require('axios');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

const KHALTI_VERIFY_URL = 'https://khalti.com/api/v2/payment/verify/';
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;

// @route    POST api/payment/khalti
// @desc     Process payment with Khalti
// @access   Private
router.post(
    '/khalti',
    [
        auth,
        [
            check('token', 'Token is required').not().isEmpty(),
            check('amount', 'Amount is required').isInt({ min: 1 })
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, amount } = req.body;

        const config = {
            headers: {
                Authorization: `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const data = {
            token: token,
            amount: amount
        };

        try {
            const response = await axios.post(KHALTI_VERIFY_URL, data, config);

            if (response.data.state.name === 'Completed') {
                // Payment is successful, process the order here
                // Example: Create an order record in the database

                // const order = new Order({
                //     user: req.user.id,
                //     amount: amount,
                //     paymentId: response.data.idx
                // });
                // await order.save();

                return res.status(200).json({ msg: 'Payment successful', order: response.data });
            } else {
                return res.status(400).json({ msg: 'Payment not completed' });
            }
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

module.exports = router;
