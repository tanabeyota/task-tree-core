require("dotenv").config();
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
});

exports.generateTaskTree = onCall({
    cors: true,
    region: "asia-northeast1", // or anything, defaulting to us-central1 if unspecified
}, async (request) => {
  // 1. Authenticate user
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "この機能はログインしているユーザーのみが利用できます。"
    );
  }

  const { text } = request.data;
  if (!text) {
    throw new HttpsError("invalid-argument", "テキストが提供されていません。");
  }

  // 2. Call Gemini API
  const prompt = `以下のタスクテキストを分析し、1つの短い「要約」と、それに続く実行可能な複数の「具体的なサブタスク」に分解してください。
出力は必ず以下のJSONスキーマに厳密に従ってください。マークダウン（\`\`\`json 等）は含めず、純粋なJSONテキストのみを出力してください。

【出力JSONスキーマ】
{
  "summary": "タスク名やゴールを象徴する短く具体的な要約",
  "children": [
    "実行可能なサブタスク1",
    "実行可能なサブタスク2",
    "実行可能なサブタスク3"
  ]
}

【タスクテキスト】
${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          temperature: 0.2
      }
    });

    const jsonStr = response.text;
    const parsed = JSON.parse(jsonStr);

    if (!parsed.summary || !Array.isArray(parsed.children)) {
      throw new Error("Invalid output format from Gemini");
    }

    return parsed;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new HttpsError("internal", "タスクの分解処理中にエラーが発生しました", error.message);
  }
});
