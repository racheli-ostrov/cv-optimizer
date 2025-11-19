import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function listModels() {
  const response = await client.models.list();
  // הדפס את כל האובייקט כדי לראות את המבנה
  console.log("Raw response:", response);

  // אם יש שדה models, עבור עליו
  if (response.models && Array.isArray(response.models)) {
    console.log("Available models:");
    for (const model of response.models) {
      console.log(model.name);
    }
  } else {
    console.log("No models found or unexpected response structure.");
  }
}

listModels();