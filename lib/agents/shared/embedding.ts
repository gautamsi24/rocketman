import { google } from "@ai-sdk/google";
import { defaultEmbeddingSettingsMiddleware, wrapEmbeddingModel } from "ai";

const baseEmbeddingModel = google.embedding("gemini-embedding-001");

export const EMBEDDING_DIMENSIONS = 768;

export const documentEmbeddingModel = wrapEmbeddingModel({
  model: baseEmbeddingModel,
  middleware: defaultEmbeddingSettingsMiddleware({
    settings: {
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    },
  }),
});

export const queryEmbeddingModel = wrapEmbeddingModel({
  model: baseEmbeddingModel,
  middleware: defaultEmbeddingSettingsMiddleware({
    settings: {
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_QUERY",
        },
      },
    },
  }),
});
