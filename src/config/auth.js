const { betterAuth } = require("better-auth");

const {
  mongodbAdapter,
} = require("better-auth/adapters/mongodb");

const {
  getDB,
} = require("./db");

let auth;

// ==========================================
// Create Better Auth
// ==========================================

function createAuth() {
  if (auth) {
    return auth;
  }

  auth = betterAuth({
    database: mongodbAdapter(
      getDB()
    ),

    emailAndPassword: {
      enabled: true,
    },

    socialProviders: {
      google: {
        clientId:
          process.env.GOOGLE_CLIENT_ID,

        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET,
      },
    },

    baseURL:
      process.env.BETTER_AUTH_URL ||
      "http://localhost:5000",

    secret:
      process.env.BETTER_AUTH_SECRET,

    trustedOrigins: [
      process.env.CLIENT_URL ||
        "http://localhost:3000",
    ],
  });

  return auth;
}

module.exports = {
  createAuth,
};