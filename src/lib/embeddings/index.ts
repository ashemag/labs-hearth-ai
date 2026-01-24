// lib/embeddings/index.ts
// OpenAI embedding utilities for semantic search

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Model: text-embedding-3-small (1536 dimensions, cost-effective)
const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Generate an embedding for a single text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // Clean and truncate text if needed (model has 8191 token limit)
    const cleanedText = text.trim().slice(0, 8000);

    if (!cleanedText) {
        throw new Error("Cannot generate embedding for empty text");
    }

    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: cleanedText,
    });

    return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
        return [];
    }

    // Clean texts
    const cleanedTexts = texts.map(t => t.trim().slice(0, 8000)).filter(t => t.length > 0);

    if (cleanedTexts.length === 0) {
        return [];
    }

    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: cleanedTexts,
    });

    return response.data.map(d => d.embedding);
}

/**
 * Format embedding array for Supabase pgvector
 * Converts number[] to string format: "[0.1,0.2,0.3,...]"
 */
export function formatEmbeddingForSupabase(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
}
