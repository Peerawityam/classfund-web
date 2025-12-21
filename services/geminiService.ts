
/// <reference types="vite/client" />
// // Always use import {GoogleGenAI} from "@google/genai";
import { GoogleGenAI, Type } from "@google/genai";

// Use process.env.API_KEY directly as per guidelines. Assume it's available.
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error("Missing API Key: Please check .env file");
}

const ai = new GoogleGenAI({ apiKey: apiKey });


export interface SlipAnalysisResult {
  isValid: boolean;
  amount?: number;
  date?: string;
  bank?: string;
  senderName?: string;
  receiverName?: string;
  message: string;
}

export const analyzeSlip = async (base64Image: string): Promise<SlipAnalysisResult> => {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const prompt = `
      Analyze this image. It is supposed to be a Thai Bank Transaction Slip.
      
      Tasks:
      1. Verify if this looks like a valid banking slip.
      2. Extract the transaction amount (numbers only).
      3. Extract the bank name.
      4. Extract sender name (if visible).
    `;

    // Use gemini-3-flash-preview for multimodal tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        // Define responseSchema for reliable JSON output according to guidelines
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            amount: { type: Type.NUMBER },
            bank: { type: Type.STRING },
            senderName: { type: Type.STRING },
            receiverName: { type: Type.STRING },
            message: { type: Type.STRING },
          },
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text) as SlipAnalysisResult;
    return result;

  } catch (error) {
    console.error("Slip Analysis Error:", error);
    return {
      isValid: false,
      message: "ไม่สามารถตรวจสอบสลิปได้ (AI Error)"
    };
  }
};
