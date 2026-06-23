const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

const app = express();

mongoose.connect("mongodb://localhost:27017/sellora")
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));

app.use(express.json());  // 👈 THIS MUST BE HERE

app.get("/", (req, res) => {
    res.send("Sellora API Running");
});

// Register User
app.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const newUser = new User({
            name,
            email,
            password,
            role
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully. Waiting for admin approval.",
            user: {
    _id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    status: newUser.status
}

        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
// Get All Users (Admin)
app.get("/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Approve User (Admin)
app.put("/approve/:id", async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: "approved" },
            { new: true }
        );

        res.json({
            message: "User approved successfully",
            user
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Reject User (Admin)
app.put("/reject/:id", async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: "rejected" },
            { new: true }
        );

        res.json({
            message: "User rejected successfully",
            user
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Login User
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.password !== password) {
            return res.status(400).json({ message: "Invalid password" });
        }

        if (user.status === "pending") {
            return res.status(403).json({ message: "Your account is pending approval" });
        }

        if (user.status === "rejected") {
            return res.status(403).json({ message: "Your account has been rejected by admin" });
        }

        res.json({
    message: "Login successful",
    user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
    }
});


    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Add Product (Seller Only - Must Be Approved)
app.post("/add-product", async (req, res) => {
    try {
        const { name, price, description, sellerId } = req.body;

        const seller = await User.findById(sellerId);

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        if (seller.role !== "seller") {
            return res.status(403).json({ message: "Only sellers can add products" });
        }

        if (seller.status !== "approved") {
            return res.status(403).json({ message: "Seller not approved by admin" });
        }

        const product = new Product({
            name,
            price,
            description,
            sellerId
        });

        await product.save();

        res.status(201).json({
            message: "Product added successfully",
            product
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get All Products
app.get("/products", async (req, res) => {
    try {
        const products = await Product.find().populate("sellerId", "name email");
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Place Order (Customer Only)
app.post("/place-order", async (req, res) => {
    try {
        const { customerId, products, paymentMethod } = req.body;

        const customer = await User.findById(customerId);

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        if (customer.role !== "customer") {
            return res.status(403).json({ message: "Only customers can place orders" });
        }

        if (customer.status !== "approved") {
            return res.status(403).json({ message: "Customer not approved by admin" });
        }

        // Calculate total amount
        let totalAmount = 0;

        for (let item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }
            totalAmount += product.price * item.quantity;
        }

        const order = new Order({
            customerId,
            products,
            totalAmount,
            paymentMethod
        });

        await order.save();

        res.status(201).json({
            message: "Order placed successfully",
            order
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
