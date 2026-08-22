require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const {
  connectDB,
} = require("./config/db");

const userRoutes =
  require("./routes/user.routes");

const app = express();

const PORT =
  process.env.PORT || 5000;

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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Bookora server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
}

startServer();