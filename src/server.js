require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const {
  connectDB,
} = require("./config/db");

const {
  createAuth,
} = require("./config/auth");

const {
  toNodeHandler,
} = require("better-auth/node");

const userRoutes =
  require("./routes/user.routes");

const app = express();

const PORT =
  process.env.PORT || 5000;

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
// Start Server
// ==========================================

async function startServer() {
  try {
    // 1. Connect MongoDB
    await connectDB();

    console.log(
      "Initializing Better Auth..."
    );

    // 2. Create Better Auth
    const auth = createAuth();

    // 3. Better Auth routes
    app.all(
      "/api/auth/*splat",
      toNodeHandler(auth)
    );

    // ========================================
    // Normal Routes
    // ========================================

    app.get("/", (req, res) => {
      res.json({
        success: true,
        message:
          "Bookora API is running",
      });
    });

    app.get(
      "/api/health",
      (req, res) => {
        res.json({
          success: true,
          message:
            "Bookora API is healthy",
        });
      }
    );

    app.use(
      "/api/users",
      userRoutes
    );

    // ========================================
    // 404
    // ========================================

    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    // ========================================
    // Listen
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

startServer();