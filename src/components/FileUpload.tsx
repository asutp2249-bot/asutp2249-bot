import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ProgressInfo } from '../utils/pdfParser';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  fileName?: string;
  progress?: ProgressInfo | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading, fileName, progress }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: isLoading,
  });

  const progressPercent = progress
    ? Math.round((progress.currentPage / progress.totalPages) * 100)
    : 0;

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
        transition-all duration-300 ease-in-out
        ${isDragActive
          ? 'border-blue-400 bg-blue-50 scale-[1.02] shadow-lg shadow-blue-100'
          : fileName
            ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400'
            : 'border-gray-300 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30'
        }
        ${isLoading ? 'opacity-90 cursor-wait' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">{progressPercent}%</span>
            </div>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">{progress?.stage || 'Обработка PDF...'}</p>
            <p className="text-sm text-gray-400 mt-1">{progress?.detail || 'Подождите...'}</p>
          </div>
          {progress && progress.totalPages > 0 && (
            <div className="w-full max-w-xs">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Страница {progress.currentPage} из {progress.totalPages}
              </p>
            </div>
          )}
        </div>
      ) : fileName ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-emerald-700 font-semibold">{fileName}</p>
            <p className="text-sm text-gray-400 mt-1">Нажмите или перетащите новый файл для замены</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">
              {isDragActive ? 'Отпустите файл здесь' : 'Загрузите PDF файл'}
            </p>
            <p className="text-sm text-gray-400 mt-1">Перетащите файл сюда или нажмите для выбора</p>
            <p className="text-xs text-gray-300 mt-2">Поддерживаются PDF с текстом и с картинками (OCR)</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
