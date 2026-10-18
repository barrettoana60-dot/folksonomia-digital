/**
 * Análise visual conservadora para contribuições culturais.
 *
 * A saída deste módulo é destinada ao envelope cifrado do cofre. Nenhuma
 * sugestão visual é publicada como fato e nenhuma relação é promovida sem
 * validação humana. Se não houver provedor configurado, o fallback usa apenas
 * dados catalográficos e declara explicitamente que não analisou a imagem.
 */

import crypto from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { generateSignature } from '@/lib/core/crypto';
import { GEMINI_API_KEY, GEMINI_VISION_MODEL } from '@/lib/core/env';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_TAG_LENGTH = 160;
const MAX_TEXT_LENGTH = 1_200;
const PROMPT_VERSION = 'folksonomia-visual-context/v1';

export type VisualAnalysisStatus = 'analyzed' | 'catalog_only' | 'image_unavailable' | 'provider_unavailable' | 'invalid_model_response';
export type VisualAnalysisProvider = 'gemini' | 'catalog_only' | 'unavailable';

export interface VisualCandidate {
  label: string;
  confidence: number;
  assessment: 'supports_tag' | 'related_context' | 'not_evidenced';
  rationale: string;
  promotion: 'pending_curatorial_review';
}

export interface VisualContextAnalysis {
  status: VisualAnalysisStatus;
  provider: VisualAnalysisProvider;
  model?: string;
  promptHash: string;
  imageSha256?: string;
  confidence: number;
  candidates: VisualCandidate[];
  context: Record<string, unknown>;
  notices: string[];
}

export interface AnalyzeVisualContextInput {
  tag: string;
  imageUrl?: string | null;
  /** Útil em testes ou quando o backend já obteve a imagem de fonte confiável. */
  imageBytes?: Buffer;
  imageMimeType?: string;
  catalog?: {
    title?: string | null;
    artist?: string | null;
    description?: string | null;
    material?: string | null;
    technique?: string | null;
    origin?: string | null;
  };
  geminiApiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

interface ImageMaterial {
  bytes: Buffer;
  mimeType: string;
  sha256: string;
}

function boundedText(value: unknown, limit = MAX_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

function normaliseLabel(value: unknown): string {
  return boundedText(value, 160)
    .replace(/[\u0000-\u001F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampConfidence(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(Math.min(1, Math.max(0, parsed)) * 100) / 100;
}

function safeAssessment(value: unknown): VisualCandidate['assessment'] {
  const normalised = boundedText(value, 40).toLowerCase();
  if (normalised === 'supports_tag') return 'supports_tag';
  if (normalised === 'not_evidenced') return 'not_evidenced';
  return 'related_context';
}

function publicCatalog(input: AnalyzeVisualContextInput): Record<string, string> {
  const catalog = input.catalog || {};
  return {
    title: boundedText(catalog.title, 300),
    artist: boundedText(catalog.artist, 240),
    description: boundedText(catalog.description, 900),
    material: boundedText(catalog.material, 180),
    technique: boundedText(catalog.technique, 180),
    origin: boundedText(catalog.origin, 180),
  };
}

function buildPrompt(tag: string, catalog: Record<string, string>): string {
  return `${PROMPT_VERSION}
Você atua como apoio à curadoria de patrimônio cultural. Analise SOMENTE elementos visíveis da imagem e separe-os claramente de informações do catálogo. A tag submetida por uma pessoa é uma hipótese cultural, não uma verdade.

Restrições obrigatórias:
- Não identifique pessoas, não infira etnia, religião, saúde, gênero, idade ou outros atributos sensíveis.
- Não invente autoria, proveniência, período, material ou contexto histórico.
- Não declare correspondência ou relação publicada; produza apenas propostas para revisão humana.
- Caso a imagem não sustente a tag, use "not_evidenced".
- Responda APENAS JSON válido, sem Markdown nem texto externo.

TAG SUBMETIDA: ${JSON.stringify(tag)}
CATÁLOGO (apenas contexto de apoio; não o trate como evidência visual): ${JSON.stringify(catalog)}

Esquema JSON obrigatório:
{
  "visual_summary": "até 500 caracteres, apenas observações visuais cautelosas",
  "cultural_context": ["até 4 descritores culturais propostos"],
  "tag_assessment": {
    "label": "a tag submetida",
    "assessment": "supports_tag|related_context|not_evidenced",
    "confidence": 0.0,
    "rationale": "até 240 caracteres"
  },
  "related_families": [
    {"label": "descritor", "confidence": 0.0, "rationale": "até 180 caracteres"}
  ]
}`;
}

function isPublicImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
    if (host === '::1' || host === '[::1]' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return false;
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipv4) return true;
    const octets = ipv4.slice(1).map(Number);
    if (octets.some(octet => octet > 255)) return false;
    const [a, b] = octets;
    return !(
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  } catch {
    return false;
  }
}

function isPrivateNetworkAddress(value: string): boolean {
  const address = value.toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
  }
  if (isIP(address) !== 6) return true;
  // Loopback, unspecified, unique-local, link-local and IPv4-mapped IPv6
  // never são uma origem aceitável para uma busca de imagem do servidor.
  return address === '::' || address === '::1' ||
    address.startsWith('fc') || address.startsWith('fd') ||
    /^fe[89ab]/.test(address) || address.startsWith('::ffff:');
}

async function isPublicResolvableImageUrl(value: string): Promise<boolean> {
  if (!isPublicImageUrl(value)) return false;
  try {
    const url = new URL(value);
    if (isIP(url.hostname)) return !isPrivateNetworkAddress(url.hostname);
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateNetworkAddress(address));
  } catch {
    return false;
  }
}

function allowedImageMimeType(value?: string | null): string | null {
  const mime = String(value || '').split(';')[0].trim().toLowerCase();
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mime) ? mime : null;
}

async function resolveImage(input: AnalyzeVisualContextInput, fetchImpl: typeof fetch): Promise<{ image?: ImageMaterial; notice?: string }> {
  if (input.imageBytes?.length) {
    if (input.imageBytes.length > MAX_IMAGE_BYTES) return { notice: 'Imagem excede o limite seguro de análise.' };
    const mimeType = allowedImageMimeType(input.imageMimeType) || 'image/jpeg';
    return {
      image: {
        bytes: input.imageBytes,
        mimeType,
        sha256: crypto.createHash('sha256').update(input.imageBytes).digest('hex'),
      },
    };
  }

  if (!input.imageUrl || !(await isPublicResolvableImageUrl(input.imageUrl))) {
    return { notice: 'A imagem não está disponível em uma origem pública segura.' };
  }

  try {
    const response = await fetchImpl(input.imageUrl, {
      headers: { Accept: 'image/jpeg,image/png,image/webp' },
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { notice: 'Não foi possível obter a imagem da obra para análise.' };

    const mimeType = allowedImageMimeType(response.headers.get('content-type'));
    if (!mimeType) return { notice: 'O formato da imagem não é permitido para análise.' };

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) return { notice: 'Imagem excede o limite seguro de análise.' };
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return { notice: 'Imagem vazia ou acima do limite seguro.' };

    return {
      image: {
        bytes,
        mimeType,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      },
    };
  } catch {
    return { notice: 'A imagem não pôde ser obtida dentro do limite de segurança.' };
  }
}

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseModelOutput(raw: string, submittedTag: string): { context: Record<string, unknown>; candidates: VisualCandidate[]; confidence: number } | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const source = parsed as Record<string, unknown>;
    const assessment = source.tag_assessment && typeof source.tag_assessment === 'object' && !Array.isArray(source.tag_assessment)
      ? source.tag_assessment as Record<string, unknown>
      : null;
    if (!assessment) return null;

    const candidates: VisualCandidate[] = [];
    const tagLabel = normaliseLabel(assessment.label) || submittedTag;
    candidates.push({
      label: tagLabel,
      confidence: clampConfidence(assessment.confidence),
      assessment: safeAssessment(assessment.assessment),
      rationale: boundedText(assessment.rationale, 240),
      promotion: 'pending_curatorial_review',
    });

    const families = Array.isArray(source.related_families) ? source.related_families : [];
    for (const family of families.slice(0, 6)) {
      if (!family || typeof family !== 'object' || Array.isArray(family)) continue;
      const record = family as Record<string, unknown>;
      const label = normaliseLabel(record.label);
      if (!label) continue;
      candidates.push({
        label,
        confidence: clampConfidence(record.confidence),
        assessment: 'related_context',
        rationale: boundedText(record.rationale, 180),
        promotion: 'pending_curatorial_review',
      });
    }

    const culturalContext = Array.isArray(source.cultural_context)
      ? source.cultural_context.map(item => normaliseLabel(item)).filter(Boolean).slice(0, 4)
      : [];
    const confidenceValues = candidates.map(candidate => candidate.confidence).filter(value => value > 0);
    return {
      candidates,
      confidence: confidenceValues.length
        ? Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100) / 100
        : 0,
      context: {
        visualSummary: boundedText(source.visual_summary, 500),
        culturalFamilies: culturalContext,
        modelOutputSchema: 'validated/v1',
      },
    };
  } catch {
    return null;
  }
}

function catalogFallback(params: {
  status: Extract<VisualAnalysisStatus, 'catalog_only' | 'image_unavailable' | 'provider_unavailable' | 'invalid_model_response'>;
  tag: string;
  catalog: Record<string, string>;
  promptHash: string;
  imageSha256?: string;
  notices: string[];
}): VisualContextAnalysis {
  return {
    status: params.status,
    provider: params.status === 'provider_unavailable' ? 'unavailable' : 'catalog_only',
    promptHash: params.promptHash,
    ...(params.imageSha256 ? { imageSha256: params.imageSha256 } : {}),
    confidence: 0,
    candidates: [{
      label: params.tag,
      confidence: 0,
      assessment: 'related_context',
      rationale: 'Sem inferência visual automática; a tag permanece uma contribuição humana para revisão.',
      promotion: 'pending_curatorial_review',
    }],
    context: {
      catalogOnly: true,
      catalog: params.catalog,
      limitation: 'Não houve inferência visual automatizada nesta contribuição.',
    },
    notices: params.notices,
  };
}

/**
 * Analisa uma imagem pública por modelo multimodal quando a chave está
 * configurada. Toda saída é ainda uma hipótese curatorial, não uma validação.
 */
export async function analyzeVisualContext(input: AnalyzeVisualContextInput): Promise<VisualContextAnalysis> {
  const tag = normaliseLabel(input.tag).slice(0, MAX_TAG_LENGTH);
  const catalog = publicCatalog(input);
  const prompt = buildPrompt(tag, catalog);
  const promptHash = generateSignature({ version: PROMPT_VERSION, prompt });
  const fetchImpl = input.fetchImpl || fetch;
  const imageResult = await resolveImage(input, fetchImpl);
  const apiKey = (input.geminiApiKey ?? GEMINI_API_KEY).trim();
  const model = (input.model ?? GEMINI_VISION_MODEL).trim() || 'gemini-1.5-flash';

  if (!imageResult.image) {
    return catalogFallback({
      status: 'image_unavailable',
      tag,
      catalog,
      promptHash,
      notices: [imageResult.notice || 'Imagem indisponível para análise visual.'],
    });
  }

  if (!apiKey) {
    return catalogFallback({
      status: 'provider_unavailable',
      tag,
      catalog,
      promptHash,
      imageSha256: imageResult.image.sha256,
      notices: ['Provedor multimodal não configurado; nenhum conteúdo visual foi inferido.'],
    });
  }

  try {
    const response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: imageResult.image.mimeType, data: imageResult.image.bytes.toString('base64') } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 900,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      return catalogFallback({
        status: 'provider_unavailable',
        tag,
        catalog,
        promptHash,
        imageSha256: imageResult.image.sha256,
        notices: ['O provedor multimodal não respondeu; nenhum conteúdo visual foi inferido.'],
      });
    }

    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: unknown }) => typeof part?.text === 'string' ? part.text : '')
      .join('\n') || '';
    const parsed = parseModelOutput(raw, tag);
    if (!parsed) {
      return catalogFallback({
        status: 'invalid_model_response',
        tag,
        catalog,
        promptHash,
        imageSha256: imageResult.image.sha256,
        notices: ['A resposta do provedor não respeitou o esquema seguro e foi descartada.'],
      });
    }

    return {
      status: 'analyzed',
      provider: 'gemini',
      model,
      promptHash,
      imageSha256: imageResult.image.sha256,
      confidence: parsed.confidence,
      candidates: parsed.candidates,
      context: parsed.context,
      notices: ['Inferência multimodal registrada como hipótese pendente de revisão humana.'],
    };
  } catch {
    return catalogFallback({
      status: 'provider_unavailable',
      tag,
      catalog,
      promptHash,
      imageSha256: imageResult.image.sha256,
      notices: ['A análise multimodal excedeu o limite de segurança; nenhum conteúdo visual foi inferido.'],
    });
  }
}
