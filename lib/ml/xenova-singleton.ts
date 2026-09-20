let pipelineInstance: any = null;
let pipelinePromise: Promise<any> | null = null;

export async function getXenovaPipeline(): Promise<any> {
  if (pipelineInstance) return pipelineInstance;
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    try {
      const { pipeline, env } = await import('@xenova/transformers');
      
      // Desativar cache local desnecessário no serverless ou direcionar para pasta local temporária
      env.cacheDir = './.xenova_cache';
      
      pipelineInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      return pipelineInstance;
    } catch (err) {
      console.error('[Xenova Singleton] Falha ao inicializar o pipeline do Xenova:', err);
      pipelinePromise = null;
      throw err;
    }
  })();

  return pipelinePromise;
}
