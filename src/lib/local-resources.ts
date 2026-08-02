import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { extractText, getDocumentProxy } from 'unpdf';

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 100;
const EXTRACTION_TIMEOUT_MS = 30_000;
const CHUNK_SIZE = 1_400;
const CHUNK_OVERLAP = 180;

const localDataDirectory = path.join(process.cwd(), '.koro-data');
const localResourceDirectory = path.join(localDataDirectory, 'resources');
const localResourceIndexFile = path.join(localDataDirectory, 'resources.json');

export interface LocalResourceChunk {
  id: string;
  page: number;
  content: string;
}

export interface LocalResource {
  id: string;
  subjectId: string;
  topicId: string;
  title: string;
  originalFileName: string;
  storedFileName: string;
  contentType: 'application/pdf';
  size: number;
  sha256: string;
  totalPages: number;
  characterCount: number;
  createdAt: string;
  chunks: LocalResourceChunk[];
}

export interface LocalResourceExcerpt {
  resourceId: string;
  chunkId: string;
  title: string;
  page: number;
  content: string;
}

function loadResources(): LocalResource[] {
  try {
    if (!existsSync(localResourceIndexFile)) return [];
    const parsed = JSON.parse(readFileSync(localResourceIndexFile, 'utf8'));
    return Array.isArray(parsed) ? parsed as LocalResource[] : [];
  } catch (error) {
    console.warn('Could not load local resource index:', error);
    return [];
  }
}

let resources = loadResources();

function persistResources() {
  mkdirSync(localResourceDirectory, { recursive: true });
  writeFileSync(localResourceIndexFile, JSON.stringify(resources, null, 2), 'utf8');
}

function publicResource(resource: LocalResource) {
  return {
    id: resource.id,
    subjectId: resource.subjectId,
    topicId: resource.topicId,
    title: resource.title,
    originalFileName: resource.originalFileName,
    contentType: resource.contentType,
    size: resource.size,
    totalPages: resource.totalPages,
    characterCount: resource.characterCount,
    chunkCount: resource.chunks.length,
    createdAt: resource.createdAt,
  };
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkPage(text: string, page: number, resourceId: string) {
  const chunks: LocalResourceChunk[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + CHUNK_SIZE);
    if (end < text.length) {
      const breakAt = Math.max(
        text.lastIndexOf('\n', end),
        text.lastIndexOf('. ', end),
        text.lastIndexOf(' ', end),
      );
      if (breakAt > cursor + Math.floor(CHUNK_SIZE * 0.6)) {
        end = breakAt + 1;
      }
    }

    const content = text.slice(cursor, end).trim();
    if (content) {
      chunks.push({
        id: `${resourceId}-p${page}-c${index + 1}`,
        page,
        content,
      });
      index += 1;
    }

    if (end >= text.length) break;
    cursor = Math.max(cursor + 1, end - CHUNK_OVERLAP);
  }

  return chunks;
}

function keywordSet(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

function relevanceScore(content: string, queryWords: Set<string>) {
  const normalized = content.toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (normalized.includes(word)) score += 1;
  }
  return score;
}

export function listLocalResources(subjectId?: string, topicId?: string) {
  return resources
    .filter((resource) => !subjectId || resource.subjectId === subjectId)
    .filter((resource) => !topicId || resource.topicId === topicId)
    .map(publicResource);
}

export function exportLocalResources() {
  return resources.map((resource) => ({ ...resource }));
}

export function resetLocalResources() {
  for (const resource of resources) {
    const resolvedDirectory = path.resolve(localResourceDirectory);
    const resolvedFile = path.resolve(localResourceDirectory, resource.storedFileName);
    if (
      resolvedFile.startsWith(`${resolvedDirectory}${path.sep}`) &&
      existsSync(resolvedFile)
    ) {
      unlinkSync(resolvedFile);
    }
  }
  resources = [];
  persistResources();
}

export function getLocalResourceExcerpts(
  subjectId: string,
  topicId: string | null,
  query: string,
  limit = 6,
): LocalResourceExcerpt[] {
  if (!topicId) return [];
  const queryWords = keywordSet(query);

  return resources
    .filter((resource) =>
      resource.subjectId === subjectId && resource.topicId === topicId)
    .flatMap((resource) =>
      resource.chunks.map((chunk, sourceOrder) => ({
        resourceId: resource.id,
        chunkId: chunk.id,
        title: resource.title,
        page: chunk.page,
        content: chunk.content,
        score: relevanceScore(chunk.content, queryWords),
        sourceOrder,
      })))
    .sort((a, b) => b.score - a.score || a.sourceOrder - b.sourceOrder)
    .slice(0, limit)
    .map((excerpt) => ({
      resourceId: excerpt.resourceId,
      chunkId: excerpt.chunkId,
      title: excerpt.title,
      page: excerpt.page,
      content: excerpt.content,
    }));
}

export function deleteLocalResource(resourceId: string) {
  const resource = resources.find((item) => item.id === resourceId);
  if (!resource) return false;

  const resolvedDirectory = path.resolve(localResourceDirectory);
  const resolvedFile = path.resolve(localResourceDirectory, resource.storedFileName);
  if (
    resolvedFile.startsWith(`${resolvedDirectory}${path.sep}`) &&
    existsSync(resolvedFile)
  ) {
    unlinkSync(resolvedFile);
  }

  resources = resources.filter((item) => item.id !== resourceId);
  persistResources();
  return true;
}

export async function ingestLocalPdf(input: {
  bytes: Uint8Array;
  fileName: string;
  title: string;
  subjectId: string;
  topicId: string;
}) {
  const sourceBytes = Uint8Array.from(input.bytes);
  const fileSize = sourceBytes.byteLength;

  if (fileSize === 0) {
    throw new Error('The PDF is empty');
  }
  if (fileSize > MAX_PDF_BYTES) {
    throw new Error('PDFs must be 10 MB or smaller');
  }

  const header = new TextDecoder('ascii').decode(sourceBytes.slice(0, 5));
  if (header !== '%PDF-') {
    throw new Error('The selected file is not a valid PDF');
  }

  const sha256 = createHash('sha256').update(sourceBytes).digest('hex');
  const duplicate = resources.find((resource) =>
    resource.topicId === input.topicId && resource.sha256 === sha256);
  if (duplicate) {
    return { resource: publicResource(duplicate), duplicate: true };
  }

  // PDF.js may transfer/detach its input buffer, so give it a disposable copy.
  const pdf = await getDocumentProxy(sourceBytes.slice(), {
    maxImageSize: 16_777_216,
  });

  try {
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDFs must have ${MAX_PDF_PAGES} pages or fewer`);
    }

    const extraction = extractText(pdf, { mergePages: false });
    let extractionTimeout: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      extractionTimeout = setTimeout(
        () => reject(new Error('PDF text extraction timed out')),
        EXTRACTION_TIMEOUT_MS,
      );
    });
    const result = await Promise.race([extraction, timeout])
      .finally(() => clearTimeout(extractionTimeout));
    const pages = Array.isArray(result.text) ? result.text : [result.text];
    const resourceId = `local-resource-${crypto.randomUUID()}`;
    const chunks = pages.flatMap((pageText, pageIndex) =>
      chunkPage(normalizeExtractedText(pageText), pageIndex + 1, resourceId));
    const characterCount = chunks.reduce(
      (count, chunk) => count + chunk.content.length,
      0,
    );

    if (characterCount < 100) {
      throw new Error(
        'No usable text was found. The PDF may be scanned, image-only, or incomplete.',
      );
    }

    const storedFileName = `${resourceId}.pdf`;
    const resource: LocalResource = {
      id: resourceId,
      subjectId: input.subjectId,
      topicId: input.topicId,
      title: input.title.trim() || input.fileName.replace(/\.pdf$/i, ''),
      originalFileName: path.basename(input.fileName),
      storedFileName,
      contentType: 'application/pdf',
      size: fileSize,
      sha256,
      totalPages: result.totalPages,
      characterCount,
      createdAt: new Date().toISOString(),
      chunks,
    };

    mkdirSync(localResourceDirectory, { recursive: true });
    writeFileSync(path.join(localResourceDirectory, storedFileName), sourceBytes);
    resources = [...resources, resource];
    persistResources();

    return { resource: publicResource(resource), duplicate: false };
  } finally {
    await (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.();
  }
}
