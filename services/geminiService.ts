import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Recommendation, SentimentAnalysisResult, ChatMessage } from '../types';

// Ensure API key is available before making calls
const getAiClient = () => {
  // Guidelines requirement: Use process.env.API_KEY string directly.
  // Assume it is pre-configured.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getRecommendations = async (query: string, excludeTitles: string[] = []): Promise<Recommendation[]> => {
  const ai = getAiClient();

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        type: { type: Type.STRING },
        similarityScore: { type: Type.NUMBER },
        reason: { type: Type.STRING },
        year: { type: Type.STRING },
        genre: { type: Type.STRING },
        trailerUrl: { type: Type.STRING, description: "A valid, real YouTube video URL (format: https://www.youtube.com/watch?v=VIDEO_ID) for the trailer. Do not use shortened URLs if possible." },
        posterUrl: { type: Type.STRING, description: "A publicly accessible URL for the movie poster. If unsure, leave empty." },
      },
      required: ['title', 'similarityScore', 'reason', 'type', 'year', 'genre', 'trailerUrl', 'posterUrl'],
    },
  };

  let prompt = `Recommend 8 movies or TV shows based on the user query: "${query}". 
      The query might be a specific movie title (find similar), a specific genre, a mood (e.g. 'sad', 'inspiring'), or a plot description.
      Focus on content available on Netflix historically or globally.
      Provide a match/relevance score (0-100) based on how well it fits the query.
      Provide a short, punchy reason for the recommendation (e.g. "Perfect if you like dark humor...").
      
      CRITICAL INSTRUCTIONS FOR MEDIA:
      1. TRAILERS: You MUST provide a real, working YouTube URL for the official trailer. Format: 'https://www.youtube.com/watch?v=ID'. Do not hallucinate IDs.
      2. POSTERS: Try to provide a valid URL for the poster. If you cannot guarantee a working link, leave it empty string "".`;

  if (excludeTitles.length > 0) {
    prompt += `\nDo NOT include the following titles in your response: ${excludeTitles.join(', ')}. Find different recommendations.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as Recommendation[];
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return [];
  }
};

export const getSentimentAnalysis = async (title: string): Promise<SentimentAnalysisResult | null> => {
  const ai = getAiClient();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      positivePercent: { type: Type.NUMBER },
      neutralPercent: { type: Type.NUMBER },
      negativePercent: { type: Type.NUMBER },
      summary: { type: Type.STRING },
      sampleReviews: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            author: { type: Type.STRING },
            text: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative'] },
          },
          required: ['author', 'text', 'sentiment'],
        }
      },
    },
    required: ['positivePercent', 'neutralPercent', 'negativePercent', 'summary', 'sampleReviews'],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Perform a sentiment analysis for the movie or show "${title}" based on general public reception and critics.
      Generate a plausible distribution of Positive, Neutral, and Negative sentiment percentages (they must sum to 100).
      Write a 1 sentence summary of the general consensus.
      Generate 3 representative user reviews (one for each sentiment if possible) that reflect real audience opinions.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as SentimentAnalysisResult;
  } catch (error) {
    console.error("Error fetching sentiment:", error);
    return null;
  }
};

export const chatWithAi = async (history: ChatMessage[], message: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are 'CinemAI', a witty, knowledgeable, and personalized movie assistant embedded in Netflix AI 2.0. Your goal is to help users find content they will love. Be concise, friendly, and use emojis. If asked for recommendations, list 3 titles with a 1-sentence pitch for each.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat error:", error);
    return "I'm having a bit of trouble connecting to the mainframe right now. Try again in a moment! 🤖";
  }
};

export const getMatchExplanation = async (title: string, userContext: string = "General Audience"): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Explain why the movie/show "${title}" is a good match for a viewer interested in: ${userContext}. 
      Keep it to 2 short, punchy sentences. Start with "You'll love this because..."`,
    });
    return response.text;
  } catch (error) {
    return "We think you'll love this based on your viewing history and genre preferences.";
  }
}