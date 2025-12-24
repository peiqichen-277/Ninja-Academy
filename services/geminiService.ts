
import { GoogleGenAI, Type } from "@google/genai";
import { RecognitionResult, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function verifyHandSign(
  base64Image: string,
  expectedSignName: string,
  language: Language
): Promise<RecognitionResult> {
  const languagePrompt = language === 'zh' 
    ? "请用中文回答。你是火影忍者里的老师，分析这张图片中的结印手势。判断是否为正确的'" + expectedSignName + "'。"
    : "You are a Ninja Sensei from Naruto. Analyze if this is the correct '" + expectedSignName + "' hand seal.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: `${languagePrompt}
            Return a JSON object with 'match' (boolean), 'confidence' (0-1), and 'tip' (a short encouraging piece of advice in ${language === 'zh' ? 'Chinese' : 'English'} if they are slightly off).`
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            match: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            tip: { type: Type.STRING }
          },
          required: ["match", "confidence"]
        }
      }
    });

    const result = JSON.parse(response.text.trim());
    return result as RecognitionResult;
  } catch (error) {
    console.error("Gemini Recognition Error:", error);
    return { 
      match: false, 
      confidence: 0, 
      tip: language === 'zh' ? "我分心了... 再试一次，学生。" : "I lost my focus... try again, student." 
    };
  }
}
