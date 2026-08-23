const { ObjectId } = require("mongodb");

const {
  getDB,
} = require("../config/db");

const {
  BOOK_COLLECTION,
} = require("../models/bookModel");

const {
  uploadToImgBB,
} = require("../utils/uploadImage");

// ----------------------------------------
// GET PUBLIC BOOKS
// ----------------------------------------

async function getPublicBooks(req, res) {
  try {
    const db = getDB();

    const {
      search = "",
      category = "",
      minFee = "",
      maxFee = "",
      status = "",
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(Number(limit) || 12, 6),
      12
    );

    const query = {
      approvalStatus: "published",
    };

    // ----------------------------------------
    // Search
    // ----------------------------------------

    if (search.trim()) {
      query.$or = [
        {
          title: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          author: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // ----------------------------------------
    // Category
    // ----------------------------------------

    if (category.trim()) {
      query.category = category.trim();
    }

    // ----------------------------------------
    // Availability
    // ----------------------------------------

    if (status.trim()) {
      query.status = status.trim();
    }

    // ----------------------------------------
    // Delivery Fee
    // ----------------------------------------

    if (
      minFee !== "" ||
      maxFee !== ""
    ) {
      query.deliveryFee = {};

      if (minFee !== "") {
        query.deliveryFee.$gte =
          Number(minFee);
      }

      if (maxFee !== "") {
        query.deliveryFee.$lte =
          Number(maxFee);
      }
    }

    // ----------------------------------------
    // Sorting
    // ----------------------------------------

    let sortOption = {
      createdAt: -1,
    };

    if (sort === "oldest") {
      sortOption = {
        createdAt: 1,
      };
    }

    if (sort === "fee_low") {
      sortOption = {
        deliveryFee: 1,
      };
    }

    if (sort === "fee_high") {
      sortOption = {
        deliveryFee: -1,
      };
    }

    if (sort === "title_az") {
      sortOption = {
        title: 1,
      };
    }

    // ----------------------------------------
    // Pagination
    // ----------------------------------------

    const skip =
      (currentPage - 1) * perPage;

    const collection =
      db.collection(BOOK_COLLECTION);

    const [books, total] =
      await Promise.all([
        collection
          .find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(perPage)
          .toArray(),

        collection.countDocuments(query),
      ]);

    const totalPages = Math.ceil(
      total / perPage
    );

    return res.json({
      success: true,

      data: books,

      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages,
        hasNextPage:
          currentPage < totalPages,
        hasPreviousPage:
          currentPage > 1,
      },
    });
  } catch (error) {
    console.error(
      "getPublicBooks:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch books",
    });
  }
}

// ----------------------------------------
// GET SINGLE PUBLIC BOOK
// ----------------------------------------

async function getBookById(req, res) {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const book =
      await db
        .collection(BOOK_COLLECTION)
        .findOne({
          _id: new ObjectId(id),
          approvalStatus: "published",
        });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    return res.json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error(
      "getBookById:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch book",
    });
  }
}

// ----------------------------------------
// LIBRARIAN: ADD BOOK
// ----------------------------------------

async function createBook(req, res) {
  try {
    const db = getDB();

    const {
      title,
      author,
      description,
      category,
      deliveryFee,
    } = req.body;

    if (
      !title ||
      !author ||
      !description ||
      !category ||
      deliveryFee === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All required fields must be provided",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Book cover image is required",
      });
    }

    const fee = Number(deliveryFee);

    if (
      Number.isNaN(fee) ||
      fee < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery fee must be a valid number",
      });
    }

    const coverImage =
      await uploadToImgBB(
        req.file.buffer
      );

    const now = new Date();

    const book = {
      title: title.trim(),
      author: author.trim(),
      description: description.trim(),

      category: category.trim(),

      coverImage,

      deliveryFee: fee,

      status: "available",

      // Every new book requires
      // admin approval.
      approvalStatus: "pending",

      librarianId: new ObjectId(
        req.user.id
      ),

      librarianName:
        req.user.name || "",

      librarianEmail:
        req.user.email || "",

      createdAt: now,
      updatedAt: now,
    };

    const result =
      await db
        .collection(BOOK_COLLECTION)
        .insertOne(book);

    return res.status(201).json({
      success: true,
      message:
        "Book submitted for admin approval",

      data: {
        ...book,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error(
      "createBook:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create book",
    });
  }
}

// ----------------------------------------
// LIBRARIAN: MY BOOKS
// ----------------------------------------

async function getMyBooks(req, res) {
  try {
    const db = getDB();

    const books =
      await db
        .collection(BOOK_COLLECTION)
        .find({
          librarianId:
            new ObjectId(
              req.user.id
            ),
        })
        .sort({
          createdAt: -1,
        })
        .toArray();

    return res.json({
      success: true,
      data: books,
    });
  } catch (error) {
    console.error(
      "getMyBooks:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch your books",
    });
  }
}

// ----------------------------------------
// LIBRARIAN: UPDATE BOOK
// ----------------------------------------

async function updateBook(req, res) {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const book =
      await db
        .collection(BOOK_COLLECTION)
        .findOne({
          _id: new ObjectId(id),
        });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (
      book.librarianId.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only edit your own books",
      });
    }

    const {
      title,
      author,
      description,
      category,
      deliveryFee,
    } = req.body;

    const updateData = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updateData.title =
        title.trim();
    }

    if (author !== undefined) {
      updateData.author =
        author.trim();
    }

    if (description !== undefined) {
      updateData.description =
        description.trim();
    }

    if (category !== undefined) {
      updateData.category =
        category.trim();
    }

    if (deliveryFee !== undefined) {
      const fee = Number(
        deliveryFee
      );

      if (
        Number.isNaN(fee) ||
        fee < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid delivery fee",
        });
      }

      updateData.deliveryFee = fee;
    }

    if (req.file) {
      updateData.coverImage =
        await uploadToImgBB(
          req.file.buffer
        );
    }

    await db
      .collection(BOOK_COLLECTION)
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updateData,
        }
      );

    const updatedBook =
      await db
        .collection(BOOK_COLLECTION)
        .findOne({
          _id: new ObjectId(id),
        });

    return res.json({
      success: true,
      message:
        "Book updated successfully",
      data: updatedBook,
    });
  } catch (error) {
    console.error(
      "updateBook:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update book",
    });
  }
}

// ----------------------------------------
// LIBRARIAN: DELETE BOOK
// ----------------------------------------

async function deleteBook(req, res) {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const book =
      await db
        .collection(BOOK_COLLECTION)
        .findOne({
          _id: new ObjectId(id),
        });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const isOwner =
      book.librarianId.toString() ===
      req.user.id;

    const isAdmin =
      req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this book",
      });
    }

    await db
      .collection(BOOK_COLLECTION)
      .deleteOne({
        _id: new ObjectId(id),
      });

    return res.json({
      success: true,
      message:
        "Book deleted successfully",
    });
  } catch (error) {
    console.error(
      "deleteBook:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete book",
    });
  }
}

// ----------------------------------------
// LIBRARIAN: UNPUBLISH
// ----------------------------------------

async function unpublishBook(
  req,
  res
) {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const book =
      await db
        .collection(BOOK_COLLECTION)
        .findOne({
          _id: new ObjectId(id),
        });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (
      book.librarianId.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only manage your own books",
      });
    }

    if (
      book.approvalStatus !==
      "published"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only published books can be unpublished",
      });
    }

    await db
      .collection(BOOK_COLLECTION)
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            approvalStatus:
              "unpublished",
            updatedAt: new Date(),
          },
        }
      );

    return res.json({
      success: true,
      message:
        "Book unpublished successfully",
    });
  } catch (error) {
    console.error(
      "unpublishBook:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to unpublish book",
    });
  }
}

// ----------------------------------------
// ADMIN: PENDING BOOKS
// ----------------------------------------

async function getPendingBooks(
  req,
  res
) {
  try {
    const db = getDB();

    const books =
      await db
        .collection(BOOK_COLLECTION)
        .find({
          approvalStatus:
            "pending",
        })
        .sort({
          createdAt: -1,
        })
        .toArray();

    return res.json({
      success: true,
      data: books,
    });
  } catch (error) {
    console.error(
      "getPendingBooks:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch pending books",
    });
  }
}

// ----------------------------------------
// ADMIN: APPROVE BOOK
// ----------------------------------------

async function approveBook(
  req,
  res
) {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const result =
      await db
        .collection(BOOK_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(id),
            approvalStatus:
              "pending",
          },
          {
            $set: {
              approvalStatus:
                "published",

              status:
                "available",

              updatedAt:
                new Date(),
            },
          }
        );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message:
          "Pending book not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Book approved and published",
    });
  } catch (error) {
    console.error(
      "approveBook:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to approve book",
    });
  }
}

// ----------------------------------------
// ADMIN: ALL BOOKS
// ----------------------------------------

async function getAllBooks(
  req,
  res
) {
  try {
    const db = getDB();

    const books =
      await db
        .collection(BOOK_COLLECTION)
        .find({})
        .sort({
          createdAt: -1,
        })
        .toArray();

    return res.json({
      success: true,
      data: books,
    });
  } catch (error) {
    console.error(
      "getAllBooks:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch all books",
    });
  }
}

// ----------------------------------------
// ADMIN: FORCE UNPUBLISH
// ----------------------------------------

async function adminUnpublishBook(
  req,
  res
) {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const result =
      await db
        .collection(BOOK_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              approvalStatus:
                "unpublished",

              updatedAt:
                new Date(),
            },
          }
        );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Book forcibly unpublished",
    });
  } catch (error) {
    console.error(
      "adminUnpublishBook:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to unpublish book",
    });
  }
}

// ----------------------------------------
// EXPORTS
// ----------------------------------------

module.exports = {
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
};