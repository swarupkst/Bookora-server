require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const bookRoutes = require("./routes/bookRoutes");
const userRoutes = require("./routes/user.routes");

const {
  connectDB,
  getDB,
} = require("./config/db");

const {
  createAuth,
} = require("./config/auth");

const {
  toNodeHandler,
} = require("better-auth/node");

const app = express();

const PORT = process.env.PORT || 5000;

// ==========================================
// MongoDB Indexes
// ==========================================

async function createBookIndexes() {
  try {
    const db = getDB();

    const books = db.collection("books");

    // 1. Approval status + newest books
    await books.createIndex({
      approvalStatus: 1,
      createdAt: -1,
    });

    // 2. Category + approval status
    await books.createIndex({
      category: 1,
      approvalStatus: 1,
    });

    // 3. Status + approval status
    await books.createIndex({
      status: 1,
      approvalStatus: 1,
    });

    // 4. Delivery fee
    await books.createIndex({
      deliveryFee: 1,
    });

    // 5. Librarian ID
    await books.createIndex({
      librarianId: 1,
    });

    console.log("Book indexes created successfully");
  } catch (error) {
    console.error(
      "Failed to create book indexes:",
      error
    );
  }
}

// ==========================================
// Middleware
// ==========================================

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());

// ==========================================
// Book Routes
// ==========================================

app.use(
  "/api/books",
  bookRoutes
);

// ==========================================
// Start Server
// ==========================================

async function startServer() {
  try {
    // ========================================
    // 1. Connect MongoDB
    // ========================================

    await connectDB();

    // ========================================
    // 2. Create MongoDB Indexes
    // ========================================

    await createBookIndexes();

    // ========================================
    // 3. Initialize Better Auth
    // ========================================

    console.log(
      "Initializing Better Auth..."
    );

    const auth = createAuth();

    // ========================================
    // 4. Better Auth Routes
    // ========================================

    app.all(
      "/api/auth/*splat",
      toNodeHandler(auth)
    );

    // ========================================
    // 5. Root Route
    // ========================================

    app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "Bookora API is running",
      });
    });

    // ========================================
    // 6. Health Check
    // ========================================

    app.get(
      "/api/health",
      (req, res) => {
        res.json({
          success: true,
          message: "Bookora API is healthy",
        });
      }
    );

    // ========================================
    // 7. User Routes
    // ========================================

    app.use(
      "/api/users",
      userRoutes
    );

    // ========================================
    // 8. 404 Handler
    // ========================================

    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    // ========================================
    // 9. Start Server
    // ========================================

    app.listen(PORT, () => {
      console.log(
        `Bookora server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error
    );

    process.exit(1);
  }
}

// ==========================================
// Start Application
// ==========================================

startServer();