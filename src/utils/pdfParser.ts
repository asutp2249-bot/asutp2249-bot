import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`;

/* ─── Types ─── */

export interface PageData {
  /** Тема / заголовок вверху страницы */
  topic: string;
  /** Номер страницы из самого PDF (текст внизу) */
  pageNumberInDoc: string;
  /** Порядковый номер при парсинге (1, 2, 3…) */
  pageIndex: number;
  /** Всё текстовое содержимое между заголовком и номером */
  content: string;
  /** Отдельные строки содержимого (для поиска) */
  lines: string[];
  /** Изображение страницы в исходном виде (data URL) */
  imageDataUrl: string;
}

export interface ParsedDocument {
  pages: PageData[];
  /** Все уникальные темы */
  topics: string[];
  /** Карта: тема → страницы, на которых она встречается */
  topicPages: Record<string, PageData[]>;
}

export interface ProgressInfo {
  stage: string;
  currentPage: number;
  totalPages: number;
  detail?: string;
}

type ProgressCallback = (info: ProgressInfo) => void;

/* ─── Helpers ─── */

/**
 * Рендерит страницу PDF в canvas и возвращает data URL изображения.
 * scale = 2.5 для OCR (высокое качество), scale = 1.2 для превью
 */
async function renderPageToImage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number = 1.5,
): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // JPEG для меньшего размера
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

/**
 * Рендерит страницу для OCR (высокое разрешение)
 */
async function renderPageForOCR(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/png');
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

async function extractTextFromPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const tc = await page.getTextContent();
  return tc.items
    .map((item: any) => item.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Из сырого текста страницы извлекаем:
 * - topic  — первая непустая строка (заголовок)
 * - pageNumberInDoc — последнее число в конце текста (номер страницы)
 * - content — всё между ними
 */
function extractPageParts(rawText: string, pageIndex: number, imageDataUrl: string): PageData {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return {
      topic: '',
      pageNumberInDoc: String(pageIndex),
      pageIndex,
      content: '',
      lines: [],
      imageDataUrl,
    };
  }

  // --- Определяем номер страницы (последние строки) ---
  let pageNumberInDoc = '';
  let contentEndIdx = lines.length;

  // Проверяем последние 3 строки — ищем чистое число
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
    const cleaned = lines[i].replace(/[^\d]/g, '');
    // Если строка — просто число (возможно с пробелами/точками)
    if (/^\s*\d{1,4}\s*$/.test(lines[i].replace(/[.—\-–]/g, '').trim())) {
      pageNumberInDoc = cleaned;
      contentEndIdx = i;
      break;
    }
  }

  if (!pageNumberInDoc) {
    pageNumberInDoc = String(pageIndex);
  }

  // --- Определяем заголовок (первые строки) ---
  let topic = '';
  let contentStartIdx = 0;

  if (lines.length >= 2) {
    const firstLine = lines[0];
    // Если первая строка ≤ 150 символов — считаем заголовком
    if (firstLine.length <= 150) {
      topic = firstLine;
      contentStartIdx = 1;

      // Если вторая строка тоже короткая и похожа на подзаголовок, добавляем
      if (lines.length >= 3 && lines[1].length <= 100 && lines[1].length < lines[2]?.length) {
        topic = firstLine + ' — ' + lines[1];
        contentStartIdx = 2;
      }
    } else {
      topic = '(Без заголовка)';
    }
  } else {
    topic = lines[0].length <= 150 ? lines[0] : '(Без заголовка)';
    contentStartIdx = lines[0].length <= 150 ? 1 : 0;
  }

  const contentLines = lines.slice(contentStartIdx, contentEndIdx);
  const content = contentLines.join('\n');

  return {
    topic: topic.trim(),
    pageNumberInDoc,
    pageIndex,
    content,
    lines: contentLines,
    imageDataUrl,
  };
}

/* ─── Main parser ─── */

export async function parsePDF(
  file: File,
  language: string = 'rus+eng',
  onProgress?: ProgressCallback,
): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages: PageData[] = [];

  onProgress?.({ stage: 'Анализ документа...', currentPage: 0, totalPages, detail: 'Определяем тип PDF' });

  // Проверяем есть ли текстовый слой
  let totalTextLen = 0;
  const check = Math.min(3, totalPages);
  for (let i = 1; i <= check; i++) {
    totalTextLen += (await extractTextFromPage(pdf, i)).length;
  }
  const needsOCR = totalTextLen / check < 50;

  if (needsOCR) {
    /* ──── OCR ──── */
    onProgress?.({ stage: 'Подготовка OCR...', currentPage: 0, totalPages, detail: 'Загрузка модели' });
    const worker = await Tesseract.createWorker(language, 1, { logger: () => {} });

    for (let p = 1; p <= totalPages; p++) {
      onProgress?.({ stage: 'Распознавание (OCR)', currentPage: p, totalPages, detail: `Страница ${p} из ${totalPages}` });

      // Рендерим для OCR (высокое разрешение)
      const ocrImage = await renderPageForOCR(pdf, p);
      
      // Рендерим для превью (меньшее разрешение, JPEG)
      const previewImage = await renderPageToImage(pdf, p, 1.2);

      const { data } = await worker.recognize(ocrImage);

      const raw = data.text.trim();
      if (raw.length > 3) {
        pages.push(extractPageParts(raw, p, previewImage));
      } else {
        // Даже если текста нет, сохраняем страницу с изображением
        pages.push({
          topic: '(Не удалось распознать текст)',
          pageNumberInDoc: String(p),
          pageIndex: p,
          content: '',
          lines: [],
          imageDataUrl: previewImage,
        });
      }
    }

    await worker.terminate();
  } else {
    /* ──── Текстовый PDF ──── */
    for (let p = 1; p <= totalPages; p++) {
      onProgress?.({ stage: 'Извлечение текста', currentPage: p, totalPages, detail: `Страница ${p} из ${totalPages}` });

      // Рендерим превью страницы
      const previewImage = await renderPageToImage(pdf, p, 1.2);

      const raw = await extractTextFromPage(pdf, p);
      if (raw.length > 3) {
        // Текстовый PDF может приходить без \n, попробуем разбить по двойным пробелам
        const withBreaks = raw.replace(/\s{3,}/g, '\n');
        pages.push(extractPageParts(withBreaks, p, previewImage));
      } else {
        pages.push({
          topic: '(Пустая страница)',
          pageNumberInDoc: String(p),
          pageIndex: p,
          content: '',
          lines: [],
          imageDataUrl: previewImage,
        });
      }
    }
  }

  // --- Собираем структуру тем ---
  const topicPages: Record<string, PageData[]> = {};
  for (const page of pages) {
    const t = page.topic || '(Без заголовка)';
    if (!topicPages[t]) topicPages[t] = [];
    topicPages[t].push(page);
  }

  const topics = Object.keys(topicPages);

  return { pages, topics, topicPages };
}
