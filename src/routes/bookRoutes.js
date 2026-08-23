const express = require("express");
const multer = require("multer");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const {
  getPublicBooks,
  getBookById,
  createBook,
  getMyBooks,
  updateBook,
  deleteBook,
  unpublishBook,
  getPendingBooks,
  approveBook,
  getAllBooks,
  adminUnpublishBook,
} = require("../controllers/bookController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only image files are allowed"
        )
      );
    }
  },
});

// ========================================
// PUBLIC
// ========================================

router.get("/", getPublicBooks);

// ========================================
// LIBRARIAN
// ========================================

router.post(
  "/",
  authenticate,
  authorize("librarian"),
  upload.single("coverImage"),
  createBook
);

router.get(
  "/librarian/mine",
  authenticate,
  authorize("librarian"),
  getMyBooks
);

// ========================================
// ADMIN
// ========================================

router.get(
  "/admin/pending",
  authenticate,
  authorize("admin"),
  getPendingBooks
);

router.get(
  "/admin/all",
  authenticate,
  authorize("admin"),
  getAllBooks
);

router.patch(
  "/admin/:id/approve",
  authenticate,
  authorize("admin"),
  approveBook
);

router.patch(
  "/admin/:id/unpublish",
  authenticate,
  authorize("admin"),
  adminUnpublishBook
);

// ========================================
// DYNAMIC ID ROUTES
// MUST BE LAST
// ========================================

router.get(
  "/:id",
  getBookById
);

router.patch(
  "/:id",
  authenticate,
  authorize("librarian"),
  upload.single("coverImage"),
  updateBook
);

router.delete(
  "/:id",
  authenticate,
  authorize(
    "librarian",
    "admin"
  ),
  deleteBook
);

router.patch(
  "/:id/unpublish",
  authenticate,
  authorize("librarian"),
  unpublishBook
);

module.exports = router;