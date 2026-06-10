import React, { useState } from 'react';
import type { SearchResult } from '../utils/searchEngine';

export interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  text: string;
  /** Результаты поиска */
  searchResults?: SearchResult[];
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

function renderHighlight(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 font-medium">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/* ─── Image Modal ─── */
function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-[90vh] overflow-auto bg-white rounded-lg shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>
        <img src={src} alt="Страница PDF" className="max-w-full h-auto" />
      </div>
    </div>
  );
}

/* ─── Result Card ─── */
function ResultCard({ result, index }: { result: SearchResult; index: number }) {
  const [showImage, setShowImage] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {showImage && (
        <ImageModal src={result.page.imageDataUrl} onClose={() => setShowImage(false)} />
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Тема — заголовок карточки */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-violet-700 text-xs font-bold">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <span className="uppercase tracking-wide">Тема</span>
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">#{index + 1}</span>
          </div>
          <p className="text-sm font-semibold text-gray-800 mt-1">{result.page.topic || '—'}</p>
        </div>

        {/* Содержимое */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Номер страницы */}
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Страница {result.page.pageNumberInDoc}
            </span>
            <span className="text-[10px] text-gray-400">
              Совпадение: {Math.min(100, Math.round(result.score))}%
            </span>
          </div>

          {/* Найденная строка */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-amber-600 font-semibold mb-0.5">📌 Найденный фрагмент:</p>
            <p className="text-sm text-gray-800 leading-relaxed">
              {renderHighlight(result.highlight)}
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-wrap gap-2">
            {/* Кнопка: показать изображение страницы */}
            <button
              onClick={() => setShowImage(true)}
              className="inline-flex items-center gap-1.5 text-xs bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors cursor-pointer font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Показать страницу
            </button>

            {/* Кнопка: показать весь текст */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {expanded ? 'Скрыть текст' : 'Весь текст страницы'}
            </button>
          </div>

          {/* Полный контент (раскрывающийся) */}
          {expanded && (
            <div className="mt-3 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto border border-gray-100">
              {result.page.content || '(пусто)'}
            </div>
          )}
        </div>

        {/* Превью изображения (маленькое) */}
        {result.page.imageDataUrl && (
          <div 
            className="border-t border-gray-100 p-2 bg-gray-50 cursor-zoom-in hover:bg-gray-100 transition-colors"
            onClick={() => setShowImage(true)}
          >
            <div className="flex items-center gap-2">
              <img 
                src={result.page.imageDataUrl} 
                alt={`Превью страницы ${result.page.pageNumberInDoc}`}
                className="h-16 w-auto rounded border border-gray-200 shadow-sm object-contain"
              />
              <div className="text-xs text-gray-400">
                <p className="font-medium text-gray-500">📄 Исходная страница</p>
                <p>Нажмите для увеличения</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Main Component ─── */
const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-gray-100 text-gray-500 text-sm px-5 py-3 rounded-2xl max-w-lg text-center whitespace-pre-wrap leading-relaxed">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${
            isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-violet-500 to-purple-600'
          }`}
        >
          {isUser ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-blue-500 text-white rounded-tr-md'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-md shadow-sm'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
          </div>

          {/* Search Result Cards */}
          {message.searchResults && message.searchResults.length > 0 && (
            <div className="mt-2 space-y-3">
              {message.searchResults.map((result, idx) => (
                <ResultCard key={idx} result={result} index={idx} />
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className={`text-[10px] mt-1 ${isUser ? 'text-right' : 'text-left'} text-gray-400`}>
            {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
