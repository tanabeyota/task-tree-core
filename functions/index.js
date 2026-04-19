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
  const prompt = `以下のタスクテキストを分析し、1つの短い「要約」と、実行するための手順を「階層的なツリー構造」に分解してください。
テキストの複雑さや情報量に応じて、AI自身が「適切な深さ」の階層（フラットが良いか、深い分類が必要か）を自由に判断してください。
出力は必ず以下のJSONスキーマに厳密に従ってください。マークダウン（\`\`\`json 等）は含めず、純粋なJSONテキストのみを出力してください。

【出力JSONスキーマ】
{
  "summary": "タスク名やゴールを象徴する短く具体的な要約",
  "tree": [
    {
      "text": "大きなタスクまたはカテゴリ名",
      "children": [
        {
          "text": "詳細タスク1",
          "children": []
        }
      ]
    }
  ]
}
※ "children" 配列の中には、さらに同じ形式 { "text": "...", "children": [...] } を必要な深さまで自由にネストさせて構いません。これ以上分解する必要がない場合は空配列 [] を指定してください。

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

    if (!parsed.summary || !Array.isArray(parsed.tree)) {
      throw new Error("Invalid output format from Gemini");
    }

    return parsed;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new HttpsError("internal", `APIエラー: ${error.message}`);
  }
});
