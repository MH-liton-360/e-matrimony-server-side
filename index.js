const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    optionsSuccessStatus: 200,
}));

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
        //await client.connect();
        const biodataCreatedCardCollection = client.db('e-matrimony').collection('biodataCreatedCard');

        // GET all biodata
        app.get('/biodataCreatedCard', async (req, res) => {
            const result = await biodataCreatedCardCollection.find().toArray();
            res.send(result);
        });


        //Admin
        app.get('/dashboard/total-biodata', async (req, res) => {
            const count = await biodataCreatedCardCollection.estimatedDocumentCount();
            res.json({ total: count });
        });

        app.get('/dashboard/male-biodata', async (req, res) => {
            const count = await biodataCreatedCardCollection.countDocuments({ biodataType: 'male' });
            res.json({ male: count });
        });

        app.get('/dashboard/female-biodata', async (req, res) => {
            const count = await biodataCreatedCardCollection.countDocuments({ biodataType: 'female' });
            res.json({ female: count });
        });

        app.get('/dashboard/premium-biodata', async (req, res) => {
            const count = await biodataCreatedCardCollection.countDocuments({ isPremium: true });
            res.json({ premium: count });
        });

        app.get('/dashboard/revenue', async (req, res) => {
            const purchases = await purchaseCollection.aggregate([
                { $group: { _id: null, totalRevenue: { $sum: "$price" } } }
            ]).toArray();

            const total = purchases[0]?.totalRevenue || 0;
            res.json({ revenue: total });
        });


        // POST new biodata
        app.post('/api/biodata', async (req, res) => {
            try {
                const data = req.body;

                // Optional: Basic validation
                if (!data.email || !data.name || !data.age) {
                    return res.status(400).json({ message: "Missing required fields" });
                }

                const result = await biodataCreatedCardCollection.insertOne(data);
                res.status(201).json({ message: 'Biodata created', biodataId: result.insertedId });
            } catch (error) {
                console.error("Error creating biodata:", error);
                res.status(500).json({ message: "Server error" });
            }
        });

        // Update route (optional)
        app.put('/api/biodata/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const updateData = req.body;

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

    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}
run().catch(console.dir);

// Base route
app.get('/', (req, res) => {
    res.send('E-Matrimony server is running');
});

// Start server
app.listen(port, () => {
    console.log(`E-Matrimony server is running on port: ${port}`);
});
