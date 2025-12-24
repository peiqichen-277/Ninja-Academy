
import { GoogleGenAI, Type } from "@google/genai";
import { RecognitionResult, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function verifyHandSign(
  base64Image: string,
  expectedSignName: string,
  language: Language,
  retries = 2
): Promise<RecognitionResult> {
  const languagePrompt = language === 'zh' 
    ? `请用中文回答。你是火影忍者里的忍术大师。分析这张图片。
       1. 首先检查镜头内是否有清晰可见的人手。如果没有，请指出“我没看到你的手”。
       2. 如果有手，判断它们是否正在组成“${expectedSignName}”印。
       3. 即使姿势不完美，只要主要特征（如交叉手指的方式、手指的指向）符合，就判为匹配。`
    : `You are a Ninja Grandmaster from Naruto. Analyze this image carefully:
       1. First, detect if human hands are visible in the frame. If no hands are clearly seen, state "I cannot see your hands clearly."
       2. If hands are present, evaluate if they are performing the "${expectedSignName}" hand seal.
       3. Be slightly lenient: if the core finger positions for "${expectedSignName}" are represented, consider it a match.`;

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
            Return a JSON object with:
            - 'match' (boolean): True if the hands represent the requested seal.
            - 'confidence' (number): 0 to 1 score.
            - 'tip' (string): A very short sentence (max 10 words) of advice or correction in ${language === 'zh' ? 'Chinese' : 'English'}.`
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
  } catch (error: any) {
    console.error("Gemini Recognition Error:", error);

    // Check for Rate Limit (429) or Server Errors (5xx)
    const isRetryable = error?.message?.includes("429") || error?.status === 429 || error?.message?.includes("500");
    
    if (isRetryable && retries > 0) {
      console.log(`Retrying... attempts left: ${retries}`);
      await sleep(2000 * (3 - retries)); // Exponential backoff: 2s, 4s
      return verifyHandSign(base64Image, expectedSignName, language, retries - 1);
    }

    let errorTip = language === 'zh' ? "查克拉紊乱...请重新结印。" : "My vision is clouded... re-form the seal.";
    if (error?.message?.includes("quota") || error?.message?.includes("429")) {
      errorTip = language === 'zh' ? "查克拉耗尽（触发频率限制），请稍等片刻再试。" : "Your chakra is depleted (Rate limit exceeded). Please rest for a few seconds.";
    }

    return { 
      match: false, 
      confidence: 0, 
      tip: errorTip
    };
  }
}
