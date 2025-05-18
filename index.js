const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// Middleware
const corsOptions = {
    origin: ["http://localhost:5173"],
    credentials: true,
    optionsSuccessStatus: 200, // fixed typo from "operationSuccessStatus"
};

const app = express();
app.use(express.json());
app.use(cors(corsOptions));

// MongoDB connection URI
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
        const biodataCreatedCardCollection = client.db('e-matrimony').collection('biodataCreatedCard');


        app.get('/biodataCreatedCard', async (req, res) => {
            const result = await biodataCreatedCardCollection.find().toArray();
            res.send(result);

        });


        //Edit Bioset


    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('E-Matrimony server is running');
});

app.listen(port, () => {
    console.log(`E-Matrimony is running on port: ${port}`);
});