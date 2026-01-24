-- =====================================================
-- ADD VECTOR EMBEDDINGS FOR NOTES
-- Uses pgvector for semantic search capabilities
-- =====================================================

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to people_notes
-- Using 1536 dimensions for OpenAI text-embedding-3-small
ALTER TABLE people_notes
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for fast similarity search
-- Using HNSW index for better performance on large datasets
CREATE INDEX IF NOT EXISTS idx_people_notes_embedding
ON people_notes
USING hnsw (embedding vector_cosine_ops);

-- Create a function for semantic search
CREATE OR REPLACE FUNCTION search_notes_by_embedding(
    search_embedding vector(1536),
    search_user_id uuid,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id int,
    people_id int,
    note text,
    source_type text,
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pn.id,
        pn.people_id,
        pn.note,
        pn.source_type,
        pn.created_at,
        1 - (pn.embedding <=> search_embedding) as similarity
    FROM people_notes pn
    WHERE pn.user_id = search_user_id
      AND pn.embedding IS NOT NULL
      AND 1 - (pn.embedding <=> search_embedding) > match_threshold
    ORDER BY pn.embedding <=> search_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_notes_by_embedding TO authenticated;
