const express = require("express");

const {
  createUserProfile,
  findUserByAuthId,
} = require("../models/user.model");

const {
  authenticate,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

// ========================================
// CREATE USER PROFILE
// ========================================

router.post(
  "/profile",
  authenticate,
  async (req, res) => {
    try {
      const {
        name,
        email,
        image,
        role,
      } = req.body;

      // Better Auth user ID
      const authUserId =
        req.user.id;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message:
            "Name and email are required.",
        });
      }

      if (
        !["user", "librarian"].includes(
          role
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid role.",
        });
      }

      const existingUser =
        await findUserByAuthId(
          authUserId
        );

      if (existingUser) {
        return res.status(200).json({
          success: true,
          message:
            "User profile already exists.",
          user: existingUser,
        });
      }

      const user =
        await createUserProfile({
          authUserId,
          name,
          email,
          image,
          role,
        });

      return res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error(
        "Create profile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create profile.",
      });
    }
  }
);

module.exports = router;