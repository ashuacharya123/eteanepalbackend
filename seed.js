const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');

// MongoDB connection
var db= "mongodb+srv://ashish:jpayotei@cluster0.qqvtkdk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

    const seedData = async () => {
        try {
            await User.deleteMany({});
            await Product.deleteMany({});
    
            const seller = new User({ name: 'Seller1', email: 'seller1@example.com', password: 'password', role: 'seller' });
            await seller.save();
    
            const product = new Product({
                name: 'Nepali Tea',
                description: 'Organic Nepali tea',
                price: 10,
                stock: 100,
                seller: seller._id
            });
            await product.save();
    
            console.log('Data seeded');
            process.exit();
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    };

seedData();