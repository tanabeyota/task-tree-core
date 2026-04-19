// require("dotenv").config();
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
  const prompt = `以下のタスクテキストを分析し、1つの短い「要約」と、実行するための手順を「いくつかのカテゴリ（フェーズ）」に分け、さらにそのカテゴリの中に「具体的な複数のサブタスク」を階層構造で出力してください。
出力は必ず以下のJSONスキーマに厳密に従ってください。マークダウン（\`\`\`json 等）は含めず、純粋なJSONテキストのみを出力してください。

【出力JSONスキーマ】
{
  "summary": "タスク名やゴールを象徴する短く具体的な要約",
  "categories": [
    {
      "categoryName": "フェーズやカテゴリ名（例: 準備、開発、テスト等）",
      "tasks": [
        "実行可能なサブタスク1",
        "実行可能なサブタスク2"
      ]
    }
  ]
}

【タスクテキスト】
${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          temperature: 0.2
      }
    });

    const jsonStr = response.text;
    const parsed = JSON.parse(jsonStr);

    if (!parsed.summary || !Array.isArray(parsed.categories)) {
      throw new Error("Invalid output format from Gemini");
    }

    return parsed;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new HttpsError("internal", `APIエラー: ${error.message}`);
  }
});
