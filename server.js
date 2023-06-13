const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const app = express();
app.use(bodyParser.json());
// Connect to the user database
const productDB = mongoose.createConnection(process.env.PRODUCT_DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });


// Define the user schema
const userSchema = new mongoose.Schema({
  user_name: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

// Create the user model
const User = productDB.model('User', userSchema);


const productSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  });
  
const Product = productDB.model('Product', productSchema);
  

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

app.post('/register', async (req, res) => {
    const { user_name, password } = req.body;
  
    // Input validation (add more validation as per your requirements)
    if (!user_name || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
  
    try {
      // Check if the username is already registered
      const existingUser = await User.findOne({ user_name });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists.' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const user = new User({ user_name, password: hashedPassword });
      await user.save();
  
      res.status(201).json({ message: 'Registration successful.' });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed.' });
    }
  });
  
  app.post('/login', async (req, res) => {
    const { user_name, password } = req.body;
  
    // Input validation (add more validation as per your requirements)
    if (!user_name || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
  
    try {
      // Find the user by username
      const user = await User.findOne({ user_name });
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
  
      // Compare the provided password with the stored hashed password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
  
      // Generate and send JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Login failed.' });
    }
  });
  
const authenticateUser = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
  
    if (!token) {
      return res.status(401).json({ error: 'Authentication failed.' });
    }
  
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed.' });
    }
  };
  
app.post('/products', authenticateUser, async (req, res) => {
    const { name, price } = req.body;
  
    // Input validation (add more validation as per your requirements)
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }
  
    try {
      // Create a new product
      const product = new Product({ name, price});
      await product.save();
  
      res.status(201).json({ message: 'Product listing created.' });
    } catch (error) {
      res.status(500).json({ error: 'Product listing failed.' });
    }
});
  
app.get('/products', async (req, res) => {
    const searchTerm = req.query.search;
  
    try {
      let products;
  
      if (searchTerm) {
        // Search for products with matching name
        products = await Product.find({ name: { $regex: searchTerm, $options: 'i' } });
      } else {
        // Fetch all products if no search term is provided
        products = await Product.find();
      }
  
      res.json({ products });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch products.' });
    }
  });

app.delete('/:id', authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findOneAndDelete({ _id: id});
  
      if (!product) {
        return res.status(404).json({ error: 'Product not found.' });
      }
  
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while deleting the product.' });
    }
});
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
});

  
  

  
