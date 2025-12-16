import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the root of the backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Gemini model
export const createGeminiModel = (streaming = true) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  console.log('🔑 Gemini API Key Check:', { 
    exists: !!apiKey, 
    length: apiKey ? apiKey.length : 0,
    model: modelName,
    streaming
  });

  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY is missing in environment variables');
    throw new Error('Google API Key is missing');
  }

  return new ChatGoogleGenerativeAI({
    apiKey: apiKey,
    model: modelName,
    temperature: 0.7,
    streaming: streaming,
    maxRetries: 3,
  });
};

// System prompts
export const SYSTEM_PROMPTS = {
  deviceIdentifier: `You are a device identification expert. Given a user's repair question, identify:
1. The device name (e.g., "iPhone 13", "PlayStation 5")
2. The specific issue or repair needed

Return your response in JSON format:
{
  "device": "device name",
  "issue": "brief issue description"
}`,

  guideSelector: `You are a repair guide expert. Given a list of available repair guides and the user's issue, select the most relevant guide.

Return your response in JSON format:
{
  "guideid": number,
  "reasoning": "brief explanation"
}

If no guide matches well, return:
{
  "guideid": null,
  "reasoning": "explanation why no guide matches"
}`,

  repairAssistant: `You are RepairFix Assistant, an expert electronics repair guide powered by iFixit.

Your role:
- Provide clear, step-by-step repair instructions
- Use the official iFixit guide data when available
- Be safety-conscious and warn about risks
- Be encouraging and supportive
- Format your responses with proper markdown including headers, lists, and images
- If images are provided, reference them in your steps

Guidelines:
- Always start with safety warnings if applicable
- List tools and parts needed
- Break down complex steps into smaller sub-steps
- Use emojis sparingly for clarity (⚠️ for warnings, ✅ for completion)
- End with encouragement and offer to answer follow-up questions`,
};

// Helper to parse JSON from LLM
export const parseJSON = (text) => {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n?(.*?)\n?```/s) || text.match(/```\n?(.*?)\n?```/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    // Try direct parse
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
};
