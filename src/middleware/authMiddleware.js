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
    // Create Better Auth instance
    const auth = createAuth();

    // Get Better Auth session
    const session =
      await auth.api.getSession({
        headers: req.headers,
      });

    // No Better Auth session
    if (!session) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    // Better Auth user ID
    const authUserId =
      session.user.id;

    // Find custom Bookora profile
    const user =
      await findUserByAuthId(
        authUserId
      );

    // Better Auth account exists,
    // but Bookora profile does not exist
    if (!user) {
      return res.status(403).json({
        success: false,
        message:
          "User profile not found",
      });
    }

    // Combine Better Auth user
    // with Bookora custom profile
    req.user = {
      ...session.user,

      // Important:
      // role comes from custom user profile
      role: user.role,

      // Keep auth ID available
      authUserId: authUserId,
    };

    // Store session
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
// EXPORTS
// ========================================

module.exports = {
  authenticate,
  authorize,
};