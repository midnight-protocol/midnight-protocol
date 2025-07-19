
interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

export class OpenRouterModelsService {
  private static modelsCache: OpenRouterModel[] = [];
  private static lastFetch: number = 0;
  private static CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  static async getAvailableModels(): Promise<OpenRouterModel[]> {
    const now = Date.now();
    
    // Use cache if recent
    if (now - this.lastFetch < this.CACHE_DURATION && this.modelsCache.length > 0) {
      return this.modelsCache;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data: OpenRouterResponse = await response.json();
      
      // Filter to popular/recommended models and sort by name
      const filteredModels = data.data
        .filter(model => {
          // Include popular models and those commonly used
          const id = model.id.toLowerCase();
          return (
            id.includes('gpt-') ||
            id.includes('claude-') ||
            id.includes('gemini-') ||
            id.includes('llama-') ||
            id.includes('mistral-') ||
            id.includes('anthropic/') ||
            id.includes('openai/') ||
            id.includes('google/')
          );
        })
        .sort((a, b) => {
          // Sort by provider first, then by model name
          const providerA = a.id.split('/')[0] || 'z';
          const providerB = b.id.split('/')[0] || 'z';
          
          if (providerA !== providerB) {
            return providerA.localeCompare(providerB);
          }
          
          return a.name.localeCompare(b.name);
        });

      this.modelsCache = filteredModels;
      this.lastFetch = now;
      
      return filteredModels;
    } catch (error) {
      
      // Return fallback models if API fails, with Claude Sonnet 4 first
      return [
        { id: 'anthropic/claude-3-5-sonnet-20241022', name: 'Anthropic Claude 3.5 Sonnet' },
        { id: 'anthropic/claude-3-opus-20240229', name: 'Anthropic Claude 3 Opus' },
        { id: 'google/gemini-2.0-flash-exp', name: 'Google Gemini 2.0 Flash (Experimental)' },
        { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
        { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' }
      ];
    }
  }

  static clearCache(): void {
    this.modelsCache = [];
    this.lastFetch = 0;
  }
}

export const openRouterModelsService = OpenRouterModelsService;
