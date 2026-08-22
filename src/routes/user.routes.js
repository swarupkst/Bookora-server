const express = require("express");

const {
  createUserProfile,
  findUserByAuthId,
} = require("../models/user.model");

const {
  requireAuth,
} = require(
  "../middleware/auth.middleware"
);

const router = express.Router();

router.post(
  "/profile",
  requireAuth,
  async (req, res) => {
    try {
      const {
        name,
        email,
        image,
        role,
      } = req.body;

      const authUserId =
        req.auth.sub;

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
      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to create profile.",
      });
    }
  }
);

module.exports = router;