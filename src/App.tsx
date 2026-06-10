import React, { useState, useRef, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ChatMessage, { Message } from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { parsePDF, PageData, ParsedDocument, ProgressInfo } from './utils/pdfParser';
import { searchPages } from './utils/searchEngine';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

const LANGUAGES = [
  { value: 'rus+eng', label: '🇷🇺 Русский + English' },
  { value: 'rus', label: '🇷🇺 Русский' },
  { value: 'eng', label: '🇺🇸 English' },
  { value: 'kaz+rus', label: '🇰🇿 Қазақша + Русский' },
  { value: 'ukr+rus', label: '🇺🇦 Українська + Русский' },
  { value: 'deu+eng', label: '🇩🇪 Deutsch + English' },
  { value: 'fra+eng', label: '🇫🇷 Français + English' },
];

const App: React.FC = () => {
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showUpload, setShowUpload] = useState(true);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [ocrLanguage, setOcrLanguage] = useState('rus+eng');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  /* ─── Upload handler ─── */
  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setProgress(null);
    try {
      const result = await parsePDF(file, ocrLanguage, (info) => setProgress(info));

      setDoc(result);
      setFileName(file.name);

      const totalChars = result.pages.reduce((s, p) => s + p.content.length, 0);
      const topicCount = result.topics.length;

      let info = `📄 Документ "${file.name}" загружен.\n`;
      info += `📃 Страниц: ${result.pages.length}\n`;
      info += `📚 Тем найдено: ${topicCount}\n`;
      info += `🔤 Символов: ~${totalChars}\n\n`;
      info += `Введите вопрос или предложение — я покажу, к какой теме оно относится и на какой странице находится.`;

      setMessages([{ id: generateId(), type: 'system', text: info, timestamp: new Date() }]);
      setShowUpload(false);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { id: generateId(), type: 'system', text: '❌ Ошибка при чтении PDF. Попробуйте другой файл.', timestamp: new Date() },
      ]);
    }
    setIsLoading(false);
    setProgress(null);
  };

  /* ─── Search ─── */
  const handleSendMessage = (text: string) => {
    if (!doc) return;

    setMessages(prev => [
      ...prev,
      { id: generateId(), type: 'user', text, timestamp: new Date() },
    ]);

    setTimeout(() => {
      const results = searchPages(text, doc.pages, 5);

      let botText: string;
      if (results.length === 0) {
        botText = 'Не нашёл совпадений. Попробуйте другие ключевые слова.';
      } else if (results[0].score >= 100) {
        botText = `Нашёл! Вот где это находится:`;
      } else if (results[0].score >= 30) {
        botText = `Вот подходящие результаты:`;
      } else {
        botText = `Точного совпадения нет, но вот похожие места:`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          type: 'bot',
          text: botText,
          searchResults: results,
          timestamp: new Date(),
        },
      ]);
    }, 200);
  };

  /* ─── Helpers ─── */
  const handleReset = () => {
    setDoc(null); setFileName(''); setMessages([]); setShowUpload(true); setProgress(null);
  };

  const handleShowTopics = () => {
    if (!doc) return;
    const lines = doc.topics.map((t, i) => {
      const pgs = doc.topicPages[t];
      const pageNums = pgs.map(p => p.pageNumberInDoc).join(', ');
      return `${i + 1}. ${t}\n   📃 Стр.: ${pageNums}`;
    });
    setMessages(prev => [
      ...prev,
      {
        id: generateId(), type: 'bot',
        text: `📚 Все темы в документе (${doc.topics.length}):\n\n${lines.join('\n\n')}`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleShowAllText = () => {
    if (!doc) return;
    const lines = doc.pages.map(
      p => `─── Тема: ${p.topic} │ Стр. ${p.pageNumberInDoc} ───\n${p.content}`,
    );
    setMessages(prev => [
      ...prev,
      {
        id: generateId(), type: 'bot',
        text: `Весь текст (${doc.pages.length} стр.):\n\n${lines.join('\n\n')}`,
        timestamp: new Date(),
      },
    ]);
  };

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PDF Навигатор</h1>
              <p className="text-xs text-gray-400">Тема → Страница → Текст</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fileName && (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-700 font-medium truncate max-w-[150px]">{fileName}</span>
                </div>
                <button onClick={() => setShowUpload(!showUpload)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 cursor-pointer" title="Загрузить другой файл">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </button>
                <button onClick={handleReset} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-500 hover:text-red-500 cursor-pointer" title="Сбросить">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 pb-4 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Upload */}
        {showUpload && (
          <div className={`py-4 ${!fileName ? 'flex-1 flex flex-col justify-center' : ''}`}>
            {!fileName && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">PDF Навигатор 📖</h2>
                <p className="text-gray-500 max-w-lg mx-auto">
                  Загрузите PDF — я определю темы и номера страниц. Введите вопрос или текст — покажу в какой теме и на какой странице он находится.
                </p>
              </div>
            )}

            {!fileName && (
              <div className="flex items-center justify-center gap-3 mb-4">
                <label className="text-sm text-gray-500">Язык:</label>
                <select value={ocrLanguage} onChange={e => setOcrLanguage(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer">
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            )}

            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} fileName={fileName} progress={progress} />

            {!fileName && !isLoading && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FeatureCard icon="🖼️" title="OCR из картинок" desc="Распознаёт текст, даже если PDF состоит из изображений" />
                <FeatureCard icon="📚" title="Определяет тему" desc="Заголовок вверху страницы = название темы. Одинаковые заголовки = одна тема" />
                <FeatureCard icon="🔍" title="Поиск по тексту" desc="Введите вопрос или фразу — бот покажет тему и номер страницы" />
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        {fileName && !showUpload && (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin">
              {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}

              {/* Quick actions */}
              {messages.length === 1 && doc && (
                <div className="flex flex-wrap gap-2 mt-4 mb-2 px-12">
                  <p className="w-full text-xs text-gray-400 mb-1">Быстрые действия:</p>
                  <QuickBtn onClick={handleShowTopics} icon="📚" label="Все темы" accent />
                  <QuickBtn onClick={handleShowAllText} icon="📜" label="Весь текст" />
                  {getSuggestions(doc.pages).map((s, i) => (
                    <QuickBtn key={i} onClick={() => handleSendMessage(s)} icon="🔍" label={s} />
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="py-3">
              <ChatInput onSend={handleSendMessage} disabled={!doc} placeholder="Введите вопрос или фрагмент текста..." />
              <p className="text-center text-[10px] text-gray-400 mt-2">
                🔒 Всё локально в браузере • OCR через Tesseract.js
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

/* ─── Small components ─── */

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-gray-100">
      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center mb-3">
        <span className="text-xl">{icon}</span>
      </div>
      <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}

function QuickBtn({ onClick, icon, label, accent }: { onClick: () => void; icon: string; label: string; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer font-medium border ${
        accent
          ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function getSuggestions(pages: PageData[]): string[] {
  if (pages.length === 0) return [];
  const out: string[] = [];
  const indices = [0, Math.floor(pages.length / 3), Math.floor(pages.length * 2 / 3)];
  for (const idx of indices) {
    if (idx >= pages.length) continue;
    const words = pages[idx].content
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !/^[\d\W]+$/.test(w));
    if (words.length >= 2) {
      const sample = words.slice(0, 4).join(' ');
      if (sample.length > 5 && sample.length < 50) out.push(sample);
    }
  }
  return out.slice(0, 3);
}

export default App;
