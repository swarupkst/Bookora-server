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

        if (req.query.bookId) {
            query.bookId = req.query.bookId;
        }

        if (req.query.status) {
            query.status = req.query.status;
        }

        if (req.query.librarianId) {
            query.librarianId = req.query.librarianId;
        }

        const books = await bookCollection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            data: books,
        });

    } catch (error) {
        console.error("GET /api/books ERROR:", error);

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
        const book = {
            ...req.body,
            createdAt: new Date(),
        };

        const result = await bookCollection.insertOne(book);

        res.status(201).json({
            success: true,
            message: "Book submitted successfully",
            insertedId: result.insertedId,
        });

    } catch (error) {
        console.error("POST /api/books ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add book",
        });
    }
});



// Update Book
app.patch("/api/books/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            librarianId,
            title,
            author,
            description,
            quantity,
            deliveryFee,
            category,
            coverImage,
        } = req.body;

        // Validate MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        // Librarian ID required
        if (!librarianId) {
            return res.status(400).json({
                success: false,
                message: "Librarian ID is required",
            });
        }

        // Find book
        const book = await bookCollection.findOne({
            _id: new ObjectId(id),
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found",
            });
        }

        // Only the librarian who added the book can edit it
        if (book.librarianId !== librarianId) {
            return res.status(403).json({
                success: false,
                message: "You can only edit your own books",
            });
        }

        // Validate required fields
        if (
            !title?.trim() ||
            !author?.trim() ||
            !description?.trim() ||
            !category
        ) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided",
            });
        }

        // Validate quantity
        const parsedQuantity = Number(quantity);

        if (
            !Number.isInteger(parsedQuantity) ||
            parsedQuantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Book quantity must be at least 1",
            });
        }

        // Validate delivery fee
        const parsedDeliveryFee = Number(
            deliveryFee
        );

        if (
            Number.isNaN(parsedDeliveryFee) ||
            parsedDeliveryFee < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Delivery fee cannot be negative",
            });
        }

        // Prepare updated data
        const updateData = {
            title: title.trim(),
            author: author.trim(),
            description: description.trim(),
            quantity: parsedQuantity,
            deliveryFee: parsedDeliveryFee,
            category,
            coverImage:
                coverImage !== undefined
                    ? coverImage
                    : book.coverImage,
            updatedAt: new Date(),
        };

        // Update book
        const result =
            await bookCollection.updateOne(
                {
                    _id: new ObjectId(id),
                    librarianId: librarianId,
                },
                {
                    $set: updateData,
                }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Book could not be updated",
            });
        }

        // Get updated book
        const updatedBook =
            await bookCollection.findOne({
                _id: new ObjectId(id),
            });

        res.status(200).json({
            success: true,
            message:
                "Book updated successfully",
            data: updatedBook,
        });

    } catch (error) {
        console.error(
            "PATCH /api/books/:id ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to update book",
        });
    }
});



//delete book 

app.delete("/api/books/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { librarianId } = req.body;

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

        // Only the librarian who added the book can delete it
        if (book.librarianId !== librarianId) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own books",
            });
        }

        const result = await bookCollection.deleteOne({
            _id: new ObjectId(id),
            librarianId: librarianId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Book could not be deleted",
            });
        }

        res.status(200).json({
            success: true,
            message: "Book deleted successfully",
        });

    } catch (error) {
        console.error("DELETE /api/books/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete book",
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