const {
  createAuth,
} = require("../config/auth");

const {
  findUserByAuthId,
} = require("../models/user.model");

// ========================================
// AUTHENTICATE
// ========================================

async function authenticate(
  req,
  res,
  next
) {
  try {
    // Get Better Auth instance
    const auth = createAuth();

    // Get Better Auth session
    const session =
      await auth.api.getSession({
        headers: req.headers,
      });

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    // Better Auth user ID
    const authUserId =
      session.user.id;

    // Find application profile
    const user =
      await findUserByAuthId(
        authUserId
      );

    if (!user) {
      return res.status(403).json({
        success: false,
        message:
          "User profile not found",
      });
    }

    // Combine Better Auth user
    // + application profile
    req.user = {
      ...session.user,

      // Custom application fields
      role: user.role,

      authUserId:
        user.authUserId,

      phone:
        user.phone || "",

      address:
        user.address || "",

      city:
        user.city || "",

      profileId:
        user._id,
    };

    // Better Auth session
    req.session =
      session.session;

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired session",
    });
  }
}

// ========================================
// AUTHORIZE
// ========================================

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        message:
          "User role is not assigned",
      });
    }

    if (
      !roles.includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied",
      });
    }

    next();
  };
}

// ========================================
// Exports
// ========================================

module.exports = {
  authenticate,
  authorize,
};