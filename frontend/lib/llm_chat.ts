import { OpenAI } from 'openai';

interface ChatRequest {
  patient_id: number;
  message: string;
  patient_context: any;
}

interface ChatResponse {
  response: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Dev only — move to server for production
});

// Helper: sleep for given milliseconds
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const userMessage = request.message.trim();

  // Simple intent detection
  const wantsPatientDetails = /(?:tell me about|show|patient).*details?/i.test(userMessage);
  const wantsSymptomCount = /how many symptoms/i.test(userMessage);
  const isPoliteRemark = /^(thanks?|thank you|merci|gracias|شكرا)$/i.test(userMessage);

  const systemPrompt = `
You are **DeepCardio Copilot** 🫀, an AI cardiology assistant designed to assist doctors with cardiovascular health queries.

🎯 **Core Rules**:
1. **Primary Focus**: Answer questions about cardiology, cardiovascular health, heart conditions, or patient-specific data from the provided context.
2. **Small Talk & Polite Responses**: If the doctor greets you, says "thanks," or makes polite small talk, respond warmly but concisely (e.g., "You're welcome, doctor! ❤️🩺").
3. **Redirect Off-topic Medical Questions**: If unrelated to health/patient care, respond with: "_I can only assist with heart health and patient care-related topics. ❤️🩺_"
4. **Language**: Match the language of the doctor’s input unless explicitly told otherwise.
5. **Concise Medical Responses**: Keep answers short (50–100 words max) unless full patient details are requested.
6. **Patient Details**: If patient details are requested, format them clearly. Use markdown tables for structured info when helpful, but also adapt formatting naturally (arrays, bullet points, emojis) depending on the type of data.
7. **Symptom Count**: For symptom count requests, count only items in the \`symptoms\` array from the patient context.
8. **Formatting**: Use markdown for clean rendering. Apply emojis and icons where relevant (e.g., ❤️ for heart rate, 🩺 for symptoms, 📊 for test results). Use bullet lists for multiple items and avoid over-formatting.
9. **Data Privacy**: Use only provided patient context.
`.trim();

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `
Patient ID: ${request.patient_id}
Patient Context: ${JSON.stringify(request.patient_context)}
Doctor's message: ${userMessage}
${isPoliteRemark
  ? '(Respond warmly and briefly, no medical data needed.)'
  : wantsPatientDetails
    ? '(Provide full patient summary in human-readable form using patient context.)'
    : wantsSymptomCount
      ? '(Provide concise symptom count from symptoms array only.)'
      : '(Answer concisely using relevant patient data only if needed.)'}
      `.trim(),
    },
  ];

  let retries = 3; // Number of retries allowed
  let delay = 2000; // Initial delay in ms (2 seconds)

  while (retries > 0) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: wantsPatientDetails ? 650 : wantsSymptomCount ? 100 : isPoliteRemark ? 60 : 350,
        messages: messages as OpenAI.ChatCompletionMessageParam[],
      });

      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error('No response content from OpenAI');
      }

      return { response: messageContent };

    } catch (error: any) {
      if (error.status === 429) {
        console.warn(`Rate limit hit. Waiting ${delay / 1000}s before retry...`);
        await sleep(delay);
        delay *= 2; // exponential backoff
        retries--;
      } else {
        console.error('OpenAI API Error:', error.message);
        throw new Error(`Failed to get response from DeepCardio Copilot: ${error.message}`);
      }
    }
  }

  throw new Error('Failed after multiple retries due to rate limits.');
}
