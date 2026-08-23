const { ObjectId } = require("mongodb");

const BOOK_COLLECTION = "books";

const bookSchema = {
  title: String,
  author: String,
  description: String,

  category: String,

  coverImage: String,

  deliveryFee: Number,

  status: String,

  approvalStatus: String,

  librarianId: ObjectId,

  librarianName: String,

  librarianEmail: String,

  createdAt: Date,
  updatedAt: Date,
};

module.exports = {
  BOOK_COLLECTION,
  bookSchema,
};