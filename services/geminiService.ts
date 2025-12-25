
/// <reference types="vite/client" />
import { GoogleGenerativeAI } from "@google/generative-ai";

// รับค่า API Key ได้ทั้งชื่อเก่าและใหม่
const API_KEY = (import.meta as any).env.VITE_GOOGLE_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing API Key! Please check .env file");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export interface SlipAnalysisResult {
  isValid: boolean;
  amount: number;
  bank: string;
  date: string;
  time: string;
  senderName: string;
  receiverName: string;
  message?: string;
}

export const analyzeSlip = async (base64Image: string): Promise<SlipAnalysisResult> => {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    // ✅ ใช้รุ่น 2.5 ตามที่ระบุ
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    console.log("🚀 Connecting to Gemini 2.5 Flash...");

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg",
      },
    };

    const prompt = `
      Analyze this image to see if it is a Thai Mobile Banking Slip.
      
      Task:
      1. Identify if this image looks like a bank transfer slip from Thailand.
      2. Extract the transaction details.
      
      Rules for "isValid":
      - Set "isValid": true IF you can find a "Transfer Amount" AND ("Date" OR "Ref ID").
      - Set "isValid": false ONLY IF it is clearly NOT a slip.
      - Note: Real slips often have background themes/cartoons. This is normal.
      - Note: Real slips often hide parts of names with asterisks (e.g., "Mr. S***"). This is VALID.

      Extraction Instructions:
      - amount: Extract the numerical amount. Remove commas (e.g. 1000.00). Return 0 if not found.
      - bank: The bank name or logo visible.
      - date: Transfer date (DD/MM/YYYY).
      - time: Transfer time.
      - senderName: Sender name.
      - receiverName: Receiver name.

      Return JSON:
      {
        "isValid": boolean,
        "amount": number,
        "bank": string,
        "date": string,
        "time": string,
        "senderName": string,
        "receiverName": string
      }
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 Gemini 2.5 Response:", text);

    const data = JSON.parse(text) as SlipAnalysisResult;

    // Logic Fallback: ช่วยดันให้ผ่านถ้าข้อมูลสำคัญครบ
    if (!data.isValid && data.amount > 0 && (data.date || data.time)) {
        return { ...data, isValid: true, message: "กู้คืนสลิปสำเร็จ (Override)" };
    }
    
    // Logic Fallback: ถ้า AI ให้ผ่านแต่ไม่มียอดเงิน
    if (data.isValid && (!data.amount || data.amount <= 0)) {
        return { ...data, isValid: false, message: "AI ตรวจสลิปผ่าน แต่อ่านยอดเงินไม่ได้" };
    }

    return data;

  } catch (error: any) {
    console.error("❌ Gemini 2.5 Analysis Error:", error);
    
    let errorMessage = "เกิดข้อผิดพลาดในการเชื่อมต่อ AI";
    
    // ดัก Error กรณีรุ่น 2.5 ยังไม่เปิดให้ใช้ในบาง Region หรือ API Key
    if (error.message?.includes("404")) {
        errorMessage = "ไม่พบโมเดล 'gemini-2.5-flash' (404) - กรุณาตรวจสอบว่า API Key รองรับรุ่นนี้หรือไม่";
    }
    if (error.message?.includes("403")) errorMessage = "API Key ผิด หรือไม่มีสิทธิ์เข้าถึง";

    return {
      isValid: false,
      amount: 0,
      bank: "",
      date: "",
      time: "",
      senderName: "",
      receiverName: "",
      message: errorMessage,
    };
  }
};