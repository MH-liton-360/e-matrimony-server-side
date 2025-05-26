const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const multer = require('multer');
const upload = multer();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ["http://localhost:5173", "https://e-matrimony-cf61e.web.app"],
    credentials: true,
    optionsSuccessStatus: 200,
}));

// Parse JSON bodies for non-multipart requests
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uru7rsz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db('e-matrimony');
        const biodataCreatedCardCollection = db.collection('biodataCreatedCard');
        const usersCollection = db.collection('users');
        const purchaseCollection = db.collection('purchases'); // assuming purchases collection exists

        // GET all biodata
        app.get('/biodataCreatedCard', async (req, res) => {
            try {
                const result = await biodataCreatedCardCollection.find().toArray();
                res.json(result);
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to get biodata" });
            }
        });

        // Get users with optional search
        app.get('/dashboard/manage-users', async (req, res) => {
            try {
                const search = req.query.search || "";
                const query = {
                    name: { $regex: search, $options: "i" }, // case-insensitive partial match
                    isRequestedPremium: true // Only users who requested premium
                };
                const users = await usersCollection.find(query).toArray();
                res.json(users);
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to get users" });
            }
        });

        // Make admin
        app.patch('/dashboard/make-admin/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role: "admin" } }
                );
                if (result.matchedCount === 0) return res.status(404).json({ message: "User not found" });
                res.json({ message: "User updated to admin" });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to update user role" });
            }
        });

        // Make premium
        app.patch('/dashboard/make-premium/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { isPremium: true, isRequestedPremium: false } }
                );
                if (result.matchedCount === 0) return res.status(404).json({ message: "User not found" });
                res.json({ message: "User marked as premium" });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to update user premium status" });
            }
        });

        // Admin stats
        app.get('/dashboard/total-biodata', async (req, res) => {
            try {
                const count = await biodataCreatedCardCollection.estimatedDocumentCount();
                res.json({ total: count });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to get total biodata count" });
            }
        });

        app.get('/dashboard/male-biodata', async (req, res) => {
            try {
                const count = await biodataCreatedCardCollection.countDocuments({ biodataType: 'male' });
                res.json({ male: count });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to get male biodata count" });
            }
        });

        app.get('/dashboard/female-biodata', async (req, res) => {
            try {
                const count = await biodataCreatedCardCollection.countDocuments({ biodataType: 'female' });
                res.json({ female: count });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to get female biodata count" });
            }
        });

        app.get('/dashboard/premium-biodata', async (req, res) => {
            try {
                const count = await biodataCreatedCardCollection.countDocuments({ isPremium: true });
                res.json({ premium: count });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to get premium biodata count" });
            }
        });

        app.get('/dashboard/revenue', async (req, res) => {
            try {
                const purchases = await purchaseCollection.aggregate([
                    { $group: { _id: null, totalRevenue: { $sum: "$price" } } }
                ]).toArray();

                const total = purchases[0]?.totalRevenue || 0;
                res.json({ revenue: total });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Failed to get revenue" });
            }
        });

        // POST new biodata
        app.post('/api/biodata', upload.single('profileImageFile'), async (req, res) => {
            try {
                const file = req.file; // uploaded file (image)
                const formData = req.body;

                // Convert numeric and boolean values properly
                if (formData.age) formData.age = parseInt(formData.age);
                if (formData.isMarried === 'true' || formData.isMarried === 'false') {
                    formData.isMarried = formData.isMarried === 'true';
                }

                // Store image as buffer with metadata if present
                if (file) {
                    formData.profileImage = {
                        originalname: file.originalname,
                        mimetype: file.mimetype,
                        buffer: file.buffer,
                    };
                }

                // Insert into collection
                const result = await biodataCreatedCardCollection.insertOne(formData);
                res.status(201).json({ message: 'Biodata created', biodataId: result.insertedId });
            } catch (error) {
                console.error("Error creating biodata:", error);
                res.status(500).json({ message: "Server error" });
            }
        });

        // PUT update biodata (supports JSON, not multipart)
        app.put('/api/biodata/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const updateData = req.body;

                // Convert numeric and boolean values
                if (updateData.age) updateData.age = parseInt(updateData.age);
                if (updateData.isMarried === 'true' || updateData.isMarried === 'false') {
                    updateData.isMarried = updateData.isMarried === 'true';
                }

                const result = await biodataCreatedCardCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: "Biodata not found" });
                }

                res.json({ message: "Biodata updated successfully" });
            } catch (err) {
                console.error("Update error:", err);
                res.status(500).json({ message: "Update failed" });
            }
        });
        // Base route
        app.get('/', (req, res) => {
            res.send('E-Matrimony server is running');
        });

        // Start server after DB connection
        app.listen(port, () => {
            console.log(`E-Matrimony server is running on port: ${port}`);
        });

    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1); // Exit app if DB connection fails
    }
}

run().catch(console.dir);


// Base route setup
app.get('/', (req, res) => {
    res.send('E-Matrimony server is running');
});

// Start server setup
app.listen(port, () => {
    console.log(`E-Matrimony server is running on port: ${port}`);
});
