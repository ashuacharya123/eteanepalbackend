// index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const path = require('path');
require('dotenv').config();


// Middleware
app.use(cors({
    origin: 'http://localhost:3000', //frontend URL
    credentials: true
}));
app.use(express.json());

// MongoDB connection
var db= "mongodb+srv://ashish:jpayotei@cluster0.qqvtkdk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

    
// Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/stripe'));

app.use('/api/auth', require('./routes/auth'));

app.use('/api/seller', require('./routes/seller'));

app.use('/api/admin', require('./routes/admin'));

app.use('/api/products', require('./routes/products'));

app.use('/api/orders', require('./routes/orders'));

app.use('/api/notifications', require('./routes/notifications'));

app.use('/api/algorithms', require('./routes/algorithms'));

app.use('/api/cart', require('./routes/cart'));

app.use('/api/user', require('./routes/user'));

app.use('/api/', require('./routes/subscriptions'));

app.use('/api/payment', require('./routes/payment'));


// Start the server
const PORT = 8000; 
// process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
