import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ 1. ใช้ (import.meta as any) เพื่อแก้ปัญหาเส้นแดงใน VS Code
const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Missing API Key! Please check .env file");
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
  message?: string; // เพิ่ม message เผื่อไว้แจ้งเหตุผล
}

export const analyzeSlip = async (base64Image: string): Promise<SlipAnalysisResult> => {
  try {
    // ตัด header ของ base64 ออก (ถ้ามี)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // ใช้รุ่น Flash เร็วและประหยัด
        generationConfig: {
            responseMimeType: "application/json" // บังคับตอบเป็น JSON เท่านั้น
        }
    });

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg",
      },
    };

    // 🔥 2. Prompt แบบ Strict: สั่งให้จับผิดรูปที่ไม่ใช่สลิป
    const prompt = `
      You are a strict bank slip verifier. Analyze this image.
      
      CRITICAL RULES:
      1. This MUST be a valid "Thai Mobile Banking Slip".
      2. It MUST contain key transaction words like "โอนเงินสำเร็จ" (Transfer Successful), "รหัสอ้างอิง" (Ref ID), "จำนวนเงิน" (Amount).
      3. REJECT IMMEDIATELY (isValid: false) if the image is:
         - A photo of a person, food, or general objects.
         - A convenience store receipt (7-11, etc.).
         - A shopping bill or invoice.
         - A QR Code scanning screen (before transfer).
         - A screenshot of a chat conversation.
      
      Extraction Tasks:
      - amount: Number only (e.g. 100.00). If not found, return 0.
      - bank: Bank name (e.g. KBank, SCB).
      - date: Transfer date (DD/MM/YYYY).
      - time: Transfer time (HH:MM).
      - senderName: Name of sender (if visible).
      - receiverName: Name of receiver (if visible).

      Return JSON format:
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
    
    // แปลง Text เป็น JSON
    const data = JSON.parse(text) as SlipAnalysisResult;

    // 🛡️ 3. Double Check (กันเหนียว):
    // ถ้า AI เผลอให้ผ่าน แต่ยอดเงินเป็น 0 หรือหาไม่เจอ -> ปรับตกทันที
    if (data.isValid && (!data.amount || data.amount <= 0)) {
        console.warn("AI marked valid but amount is 0. Rejecting.");
        return { ...data, isValid: false, message: "ไม่พบยอดเงินในสลิป" };
    }

    return data;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // ถ้า Error ให้ถือว่าไม่ผ่านไว้ก่อน
    return { 
        isValid: false, 
        amount: 0, 
        bank: "", 
        date: "", 
        time: "", 
        senderName: "", 
        receiverName: "",
        message: "ระบบตรวจสอบขัดข้อง" 
    };
  }
};