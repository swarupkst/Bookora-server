const express = require("express");

const {
  createUserProfile,
  findUserByAuthId,
} = require("../models/user.model");

const {
  createAuth,
} = require("../config/auth");

const router = express.Router();

// ========================================
// REQUIRE BETTER AUTH SESSION
// ========================================

async function requireAuth(
  req,
  res,
  next
) {
  try {
    const auth = createAuth();

    const session =
      await auth.api.getSession({
        headers: req.headers,
      });

    if (!session) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    req.auth = session;
    req.user = session.user;

    next();
  } catch (error) {
    console.error(
      "Session authentication error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired session.",
    });
  }
}

// ========================================
// CREATE USER PROFILE
// ========================================

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

      // NEVER trust authUserId
      // from frontend.
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

      // Check existing profile
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

      // Create profile
      const user =
        await createUserProfile({
          authUserId,

          name,

          email,

          image:
            image || "",

          role,
        });

      return res.status(201).json({
        success: true,
        message:
          "User profile created successfully.",
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