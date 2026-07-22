import { google } from "@ai-sdk/google";

export const tutorModel = google("gemini-flash-lite-latest");
export const classificationModel = google("gemini-flash-lite-latest");
export const ttsModel = google.speech("gemini-2.5-flash-preview-tts");
