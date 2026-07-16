import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';

@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private pinecone: Pinecone | null = null;
  private pineconeIndex: any = null;

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX || 'selixes-semantic-cache';

    if (apiKey) {
      try {
        this.pinecone = new Pinecone({ apiKey });
        this.pineconeIndex = this.pinecone.index(indexName);
        this.logger.log(`Initialized Pinecone vector store on index: ${indexName}`);
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Pinecone: ${err.message}`);
      }
    } else {
      this.logger.warn('PINECONE_API_KEY not set. Semantic caching is disabled.');
    }
  }

  isAvailable(): boolean {
    return this.pinecone !== null && this.pineconeIndex !== null;
  }

  /**
   * Generates a 1536-dimensional embedding for the given text using OpenAI.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for semantic cache embeddings');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: 'text-embedding-3-small',
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );

      return response.data.data[0].embedding;
    } catch (error: any) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queries Pinecone for the closest vector.
   * Returns the cached response payload if similarity > threshold.
   */
  async queryPinecone(vector: number[], threshold: number): Promise<any | null> {
    if (!this.pineconeIndex) return null;

    try {
      const result = await this.pineconeIndex.query({
        vector,
        topK: 1,
        includeMetadata: true,
      });

      if (result.matches && result.matches.length > 0) {
        const match = result.matches[0];
        // Score is cosine similarity if index is configured for it
        if (match.score && match.score >= threshold) {
          this.logger.log(`[Semantic Cache Hit] Score: ${match.score.toFixed(4)} >= ${threshold}`);
          if (match.metadata && match.metadata.responseData) {
            // Pinecone metadata values are strings, numbers, booleans, or lists of strings.
            // We store the serialized JSON response in responseData.
            return JSON.parse(match.metadata.responseData as string);
          }
        }
      }
      return null;
    } catch (error: any) {
      this.logger.error(`Failed to query Pinecone: ${error.message}`);
      return null;
    }
  }

  /**
   * Upserts the generated vector and the LLM response to Pinecone.
   */
  async upsertPinecone(id: string, vector: number[], responseData: any): Promise<void> {
    if (!this.pineconeIndex) return;

    try {
      await this.pineconeIndex.upsert([{
        id,
        values: vector,
        metadata: {
          responseData: JSON.stringify(responseData),
        },
      }]);
      this.logger.log(`Upserted semantic cache vector ${id} to Pinecone`);
    } catch (error: any) {
      this.logger.error(`Failed to upsert to Pinecone: ${error.message}`);
    }
  }
}
