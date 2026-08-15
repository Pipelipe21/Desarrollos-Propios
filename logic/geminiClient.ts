import { GoogleGenAI } from "@google/genai";

// Lazily constructs the Gemini client so a missing/invalid API key disables AI
// features gracefully instead of crashing the whole app at module-load time
// (the SDK throws synchronously in its constructor when no key is set).
let client: GoogleGenAI | null | undefined;

export const getGeminiClient = (): GoogleGenAI | null => {
  if (client !== undefined) return client;

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY no configurada: las funciones de IA estarán deshabilitadas.");
    client = null;
    return client;
  }

  try {
    client = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("No se pudo inicializar el cliente de Gemini.", error);
    client = null;
  }
  return client;
};
