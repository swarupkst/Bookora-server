const { getDB } = require("../config/db");

function usersCollection() {
  return getDB().collection("users");
}

async function createUserProfile(data) {
  const collection = usersCollection();

  const existing =
    await collection.findOne({
      authUserId: data.authUserId,
    });

  if (existing) {
    return existing;
  }

  const user = {
    authUserId: data.authUserId,

    name: data.name,

    email: data.email,

    image: data.image || "",

    role: data.role || "user",

    phone: "",

    address: "",

    city: "",

    createdAt: new Date(),

    updatedAt: new Date(),
  };

  const result =
    await collection.insertOne(user);

  return {
    ...user,
    _id: result.insertedId,
  };
}

async function findUserByAuthId(
  authUserId
) {
  return usersCollection().findOne({
    authUserId,
  });
}

async function findUserByEmail(email) {
  return usersCollection().findOne({
    email,
  });
}

module.exports = {
  createUserProfile,
  findUserByAuthId,
  findUserByEmail,
};