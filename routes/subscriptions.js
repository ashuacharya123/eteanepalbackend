const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Subscriber = require('../models/Subscriber');

// Subscribe to email notifications
router.post('/subscribe', [
    check('email', 'Please include a valid email').isEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
        let subscriber = await Subscriber.findOne({ email });
        if (subscriber) {
            subscriber.subscribed = true;
        } else {
            subscriber = new Subscriber({ email });
        }
        await subscriber.save();
        res.json({ msg: 'Subscribed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Unsubscribe from email notifications
router.post('/unsubscribe', [
    check('email', 'Please include a valid email').isEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
        let subscriber = await Subscriber.findOne({ email });
        if (subscriber) {
            subscriber.subscribed = false;
            await subscriber.save();
            res.json({ msg: 'Unsubscribed successfully' });
        } else {
            res.status(404).json({ msg: 'Email not found' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
