const express = require("express");
const cors = require("cors");
require("dotenv").config();

const Stripe = require("stripe");

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

const {
    MongoClient,
    ServerApiVersion,
    ObjectId,
} = require("mongodb");

const app = express();
const port = process.env.PORT;

// Middleware
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);

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



// =====================================================
// STRIPE CHECKOUT
// =====================================================

app.post(
    "/payments/create-checkout-session",
    async (req, res) => {
        try {
            const { bookId } = req.body;

            // Validate Book ID
            if (!bookId) {
                return res.status(400).json({
                    success: false,
                    message: "Book ID is required.",
                });
            }

            if (!ObjectId.isValid(bookId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid book ID.",
                });
            }

            // Find book from MongoDB
            const book =
                await bookCollection.findOne({
                    _id: new ObjectId(bookId),
                });

            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: "Book not found.",
                });
            }

            // Check book status
            if (book.status !== "approved") {
                return res.status(400).json({
                    success: false,
                    message:
                        "This book is not available for delivery.",
                });
            }

            // Check quantity
            const quantity = Number(
                book.quantity || 0
            );

            if (quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This book is currently out of stock.",
                });
            }

            // Get delivery fee from MongoDB
            // This value is already in USD
            const deliveryFee = Number(
                book.deliveryFee || 0
            );

            if (
                !Number.isFinite(deliveryFee) ||
                deliveryFee <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid delivery fee.",
                });
            }

            // Stripe uses cents
            // Example:
            // $10 = 1000 cents
            const stripeAmount = Math.round(
                deliveryFee * 100
            );

            // Create Stripe Checkout Session
            const session =
                await stripe.checkout.sessions.create(
                    {
                        mode: "payment",

                        line_items: [
                            {
                                price_data: {
                                    currency: "usd",

                                    product_data: {
                                        name:
                                            book.title ||
                                            "Bookora Book",

                                        description:
                                            "Bookora book delivery fee",
                                    },

                                    unit_amount:
                                        stripeAmount,
                                },

                                quantity: 1,
                            },
                        ],

                        success_url:
                            `${process.env.FRONTEND_URL}/payment/success` +
                            `?session_id={CHECKOUT_SESSION_ID}` +
                            `&bookId=${bookId}`,

                        cancel_url:
                            `${process.env.FRONTEND_URL}/books/${bookId}`,

                        metadata: {
                            bookId:
                                bookId.toString(),

                            title:
                                book.title || "",

                            deliveryFee:
                                deliveryFee.toString(),
                        },
                    }
                );

            return res.status(200).json({
                success: true,
                url: session.url,
                sessionId: session.id,
            });
        } catch (error) {
            console.error(
                "Stripe Checkout Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to create Stripe checkout session.",
            });
        }
    }
);

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



// ADMIN - APPROVE PENDING BOOK


app.patch("/api/admin/books/:id/approve", async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        // Find pending book
        const book = await bookCollection.findOne({
            _id: new ObjectId(id),
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found",
            });
        }

        // Only pending books can be approved
        if (book.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending books can be approved",
            });
        }

        // Approve book
        const result = await bookCollection.updateOne(
            {
                _id: new ObjectId(id),
                status: "pending",
            },
            {
                $set: {
                    status: "approved",
                    approvedAt: new Date(),
                    updatedAt: new Date(),
                },
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Book could not be approved",
            });
        }

        // Get updated book
        const updatedBook = await bookCollection.findOne({
            _id: new ObjectId(id),
        });

        res.status(200).json({
            success: true,
            message: "Book approved successfully",
            data: updatedBook,
        });

    } catch (error) {
        console.error(
            "PATCH /api/admin/books/:id/approve ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to approve book",
        });
    }
});






        // ADMIN - DELETE PENDING BOOK


app.delete("/api/admin/books/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        // Find pending book
        const book = await bookCollection.findOne({
            _id: new ObjectId(id),
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found",
            });
        }

        // Admin approval queue should only delete pending books
        if (book.status !== "pending") {
            return res.status(400).json({
                success: false,
                message:
                    "Only pending books can be deleted from the approval queue",
            });
        }

        // Delete pending book
        const result = await bookCollection.deleteOne({
            _id: new ObjectId(id),
            status: "pending",
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Book could not be deleted",
            });
        }

        res.status(200).json({
            success: true,
            message: "Pending book deleted successfully",
        });

    } catch (error) {
        console.error(
            "DELETE /api/admin/books/:id ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to delete pending book",
        });
    }
});




// ==========================================
// ADMIN - UPDATE BOOK STATUS
// ==========================================

app.patch("/api/admin/books/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        // Allowed statuses
        const allowedStatuses = [
            "approved",
            "unpublished",
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book status",
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

        // Pending books must go through approval
        if (book.status === "pending") {
            return res.status(400).json({
                success: false,
                message:
                    "Pending books must be approved first",
            });
        }

        // Update status
        const result =
            await bookCollection.updateOne(
                {
                    _id: new ObjectId(id),
                },
                {
                    $set: {
                        status: status,
                        updatedAt: new Date(),
                    },
                }
            );

        if (result.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Book status could not be updated",
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
                "Book status updated successfully",
            data: updatedBook,
        });

    } catch (error) {
        console.error(
            "PATCH /api/admin/books/:id/status ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to update book status",
        });
    }
});




// =====================================================
// WISHLIST
// =====================================================

// Get Wishlist
app.get("/api/wishlist", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }

        const wishlist = await database
            .collection("wishlist")
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            data: wishlist,
        });
    } catch (error) {
        console.error(
            "GET /api/wishlist ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load wishlist",
        });
    }
});


// =====================================================
// Add to Wishlist
// =====================================================

app.post("/api/wishlist", async (req, res) => {
    try {
        const { userId, bookId } = req.body;

        // Validate required fields
        if (!userId || !bookId) {
            return res.status(400).json({
                success: false,
                message:
                    "userId and bookId are required",
            });
        }

        // Validate MongoDB ObjectId
        if (!ObjectId.isValid(bookId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        const wishlistCollection =
            database.collection("wishlist");

        // Prevent duplicate wishlist entries
        const existing =
            await wishlistCollection.findOne({
                userId,
                bookId,
            });

        if (existing) {
            return res.status(409).json({
                success: false,
                message:
                    "Book is already in your wishlist",
            });
        }

        // =================================================
        // Get complete book information
        // =================================================

        const book = await bookCollection.findOne({
            _id: new ObjectId(bookId),
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found",
            });
        }

        // =================================================
        // Create wishlist item
        // =================================================

        const wishlistItem = {
            userId,
            bookId,

            // Save complete book snapshot
            book: {
                title: book.title || "",
                author: book.author || "",
                description:
                    book.description || "",

                quantity: Number(
                    book.quantity || 0
                ),

                deliveryFee: Number(
                    book.deliveryFee || 0
                ),

                category:
                    book.category || "",

                coverImage:
                    book.coverImage || "",

                librarianId:
                    book.librarianId || "",

                librarianName:
                    book.librarianName || "",

                librarianEmail:
                    book.librarianEmail || "",

                status:
                    book.status || "",

                createdAt:
                    book.createdAt || null,

                approvedAt:
                    book.approvedAt || null,
            },

            createdAt: new Date(),
        };

        // Save wishlist
        const result =
            await wishlistCollection.insertOne(
                wishlistItem
            );

        res.status(201).json({
            success: true,
            message:
                "Book added to wishlist",
            data: {
                _id: result.insertedId,
                ...wishlistItem,
            },
        });
    } catch (error) {
        console.error(
            "POST /api/wishlist ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to add book to wishlist",
        });
    }
});


// =====================================================
// Remove from Wishlist
// =====================================================

app.delete("/api/wishlist", async (req, res) => {
    try {
        const { userId, bookId } = req.body;

        if (!userId || !bookId) {
            return res.status(400).json({
                success: false,
                message:
                    "userId and bookId are required",
            });
        }

        const result = await database
            .collection("wishlist")
            .deleteOne({
                userId,
                bookId,
            });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Wishlist item not found",
            });
        }

        res.status(200).json({
            success: true,
            message:
                "Book removed from wishlist",
        });
    } catch (error) {
        console.error(
            "DELETE /api/wishlist ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to remove book from wishlist",
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


////get some data 

app.get("/api/dashboard/stats", async (req, res) => {
    try {
        const data = await db
            .collection("stats")
            .find({})
            .sort({ type: 1 })
            .toArray();

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch stats",
        });
    }
});


app.get("/api/dashboard/revenue", async (req, res) => {
    try {
        const data = await db
            .collection("revenue")
            .find({})
            .toArray();

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch revenue data",
        });
    }
});


app.get("/api/dashboard/categories", async (req, res) => {
    try {
        const data = await db
            .collection("categories")
            .find({})
            .toArray();

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch category data",
        });
    }
});


app.get("/api/dashboard/pending-books", async (req, res) => {
    try {
        const data = await db
            .collection("pendingBooks")
            .find({})
            .toArray();

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch pending books",
        });
    }
});


// =====================================================
// ADMIN DASHBOARD - USERS
// =====================================================

app.get("/api/dashboard/user", async (req, res) => {
    try {
        const data = await database
            .collection("user")
            .find({})
            .toArray();

        res.status(200).json({
            success: true,
            data,
        });

    } catch (error) {
        console.error(
            "GET /api/dashboard/user ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
});


// =====================================================
// ADMIN DASHBOARD - BOOKS
// =====================================================

app.get("/api/dashboard/books", async (req, res) => {
    try {
        const data = await bookCollection
            .find({})
            .toArray();

        res.status(200).json({
            success: true,
            data,
        });

    } catch (error) {
        console.error(
            "GET /api/dashboard/books ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch books",
        });
    }
});


// =====================================================
// ADMIN DASHBOARD - TRANSACTIONS
// =====================================================

app.get("/api/dashboard/transactions", async (req, res) => {
    try {
        const data = await database
            .collection("transactions")
            .find({})
            .sort({ _id: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            data,
        });

    } catch (error) {
        console.error(
            "GET /api/dashboard/transactions ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch transactions",
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