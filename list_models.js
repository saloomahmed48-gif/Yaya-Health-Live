import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyCwGBOY4uLz4Ts5nQPx01FMRw7v1BZXb4s");

async function run() {
  try {
    // Note: The SDK itself might not have listModels exposed directly, but usually it does on the REST API.
    // Let's use fetch directly for v1beta to be safe.
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCwGBOY4uLz4Ts5nQPx01FMRw7v1BZXb4s");
    const data = await response.json();
    console.log("AVAILABLE MODELS:");
    data.models.forEach(model => {
      if (model.supportedGenerationMethods.includes("generateContent")) {
        console.log("-", model.name);
      }
    });
  } catch (e) {
    console.error(e);
  }
}

run();
