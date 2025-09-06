/**
 * A simple on-page Risk record
 */
export interface Risk {
  id: number;
  value: string;
  reason: string;
}

/**
* What the LLM returns
*/
export interface RiskSummary {
  value: string;   // e.g. "Low to Very High"
  reason: string;  // 50–70 words
  score: number;   // 1–100
}

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

/**
* Send the raw risks to OpenAI and get back a single summary object.
* @param risks  the raw risk list from the API
* @param abortSignal  optional AbortSignal so you can cancel if the user navigates away
*/
export async function summarizeRisks(
  risks: Risk[],
  abortSignal?: AbortSignal
): Promise<RiskSummary | null> {
  if (risks.length === 0) return null;

  const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      signal: abortSignal,
      headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          messages: [
              {
                  role: "system",
                  content: (
                      `You are a clinical-risk summariser. Given a JSON array named "risks", return a JSON object with exactly these keys:\n` +
                      `{\n` +
                      `  "value": string,   // Low, Low to Moderate, Moderate, Moderate to High, High, Very High\n` +
                      `  "reason": string,  // 50-70 words, correct grammar, explaining the risk assessment\n` +
                      `  "score": number    // 1-100, reflecting the severity of the risk\n` +
                      `}\n` +
                      `Respond only with the JSON object, no additional text.`
                  ),
              },
              {
                  role: "user",
                  content: JSON.stringify({ risks })
              }
          ]
      }),
  });

  if (!response.ok) {
      console.error(
          `OpenAI ${response.status} ${response.statusText}`,
          await response.text()
      );
      return null;
  }

  const json = await response.json() as {
      choices: { message: { content: string } }[];
  };

  try {
      return JSON.parse(json.choices[0].message.content) as RiskSummary;
  } catch (err) {
      console.error("Couldn’t parse risk summary →", json, err);
      return null;
  }
}