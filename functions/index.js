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

  const { text, currentTime } = request.data;
  if (!text) {
    throw new HttpsError("invalid-argument", "テキストが提供されていません。");
  }

  // 2. Call Gemini API
  const prompt = `以下のタスクテキストを分析し、1つの短い「要約」と、実行するための手順を「階層的なツリー構造」に分解してください。
テキストの複雑さや情報量に応じて、AI自身が「適切な深さ」の階層を自由に判断してください。

【時間・締め切りの自動抽出について】
テキスト内に「時間枠（例: 2時間）」や「締め切り（例: 今日の15時まで、明日の朝など）」の指定があれば、それを抽出し "duration"（数値, 単位は時間）や "deadline"（ISO8601形式の文字列 "YYYY-MM-DDTHH:mm"）として設定してください。
※ 基準となる現在時刻は【${currentTime}】です。この時刻を基準にして、締め切り日時を正確なISO文字列に変換してください。時間指定がない場合は null を設定するかプロパティを省略してください。

出力は必ず以下のJSONスキーマに厳密に従ってください。マークダウン（\`\`\`json 等）は含めず、純粋なJSONテキストのみを出力してください。

【出力JSONスキーマ】
{
  "summary": "タスク名やゴールを象徴する短く具体的な要約",
  "tree": [
    {
      "text": "大きなタスクまたはカテゴリ名",
      "deadline": "2026-04-20T15:00", 
      "duration": 2.5,
      "children": [
        {
          "text": "詳細タスク1",
          "children": []
        }
      ]
    }
  ]
}
※ "children" 配列の中には、さらに同じ形式 { "text": "...", "deadline": "...", "duration": ..., "children": [...] } を必要な深さまで自由にネストさせて構いません。これ以上分解する必要がない場合は空配列 [] を指定してください。

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
