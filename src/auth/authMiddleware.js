const auth = require("./auth");

async function requireAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    
    if (!session || !session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    
    req.authUser = session.user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ success: false, message: "Invalid authentication" });
  }
}

module.exports = { requireAuth };