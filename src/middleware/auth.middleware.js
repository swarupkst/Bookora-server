const jose = require("jose");

const JWKS_URL =
  process.env.BETTER_AUTH_JWKS_URL;

const JWKS = jose.createRemoteJWKSet(
  new URL(JWKS_URL)
);

async function requireAuth(
  req,
  res,
  next
) {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const [
      scheme,
      token,
    ] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization header.",
      });
    }

    const { payload } =
      await jose.jwtVerify(
        token,
        JWKS,
        {
          issuer:
            process.env
              .BETTER_AUTH_URL,

          audience:
            process.env
              .BETTER_AUTH_URL,
        }
      );

    req.auth = payload;

    next();
  } catch (error) {
    console.error(
      "JWT verification failed:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token.",
    });
  }
}

module.exports = {
  requireAuth,
};