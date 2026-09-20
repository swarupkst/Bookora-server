const express = require("express");
const cors = require("cors");
const {
    MongoClient,
    ServerApiVersion,
    ObjectId,
} = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const database = client.db("bookora");
const bookCollection = database.collection("books");

// Home route
app.get("/", (req, res) => {
    res.send("Bookora Server is running!");
});

// Get Books
app.get("/api/books", async (req, res) => {
    try {
        const query = {};

        // Filter by bookId
        if (req.query.bookId) {
            query.bookId = req.query.bookId;
        }

        // Filter by status
        if (req.query.status) {
            query.status = req.query.status;
        }

        const books = await bookCollection
            .find(query)
            .toArray();

        res.status(200).json({
            success: true,
            data: books,
        });

    } catch (error) {
        console.error(
            "GET /api/books ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch books",
        });
    }
});

// Get Single Book
app.get("/api/books/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        const book = await bookCollection.findOne({
            _id: new ObjectId(id),
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found",
            });
        }

        res.status(200).json({
            success: true,
            data: book,
        });

    } catch (error) {
        console.error(
            "GET /api/books/:id ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch book",
        });
    }
});

// Add Book
app.post("/api/books", async (req, res) => {
    try {
        const book = req.body;

        console.log("Received book:", book);

        const result =
            await bookCollection.insertOne(book);

        res.status(201).json({
            success: true,
            message: "Book submitted successfully",
            insertedId: result.insertedId,
        });

    } catch (error) {
        console.error(
            "POST /api/books ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to add book",
        });
    }
});

// Start server
async function run() {
    try {
        await client.connect();

        await client
            .db("bookora")
            .command({ ping: 1 });

        console.log(
            "Pinged your deployment. Successfully connected to MongoDB!"
        );

        app.listen(port, () => {
            console.log(
                `Bookora server running on port ${port}`
            );
        });

    } catch (error) {
        console.error(
            "MongoDB connection failed:",
            error
        );
    }
}

run();