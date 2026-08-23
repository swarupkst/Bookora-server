const axios = require("axios");
const FormData = require("form-data");

async function uploadToImgBB(fileBuffer) {
  if (!fileBuffer) {
    throw new Error("Image file is required");
  }

  if (!process.env.IMGBB_API_KEY) {
    throw new Error(
      "IMGBB_API_KEY is not configured"
    );
  }

  const formData = new FormData();

  formData.append(
    "image",
    fileBuffer.toString("base64")
  );

  const response = await axios.post(
    `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
    formData,
    {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  if (!response.data?.success) {
    throw new Error(
      "Image upload failed"
    );
  }

  return response.data.data.url;
}

module.exports = {
  uploadToImgBB,
};