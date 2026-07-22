import React from 'react';

interface PreviewFile {
  isImage: boolean;
  name: string;
  url: string;
}

interface AttachmentPreviewProps {
  previewGroup: PreviewFile[];
  previewIndex: number;
  setPreviewIndex: (idx: number | ((prev: number) => number)) => void;
  onClose: () => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  previewGroup,
  previewIndex,
  setPreviewIndex,
  onClose
}) => {
  if (previewGroup.length === 0 || previewIndex < 0) return null;

  const currentFile = previewGroup[previewIndex];

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <span className="text-sm font-bold text-slate-200">File Preview ({previewIndex + 1} of {previewGroup.length})</span>
          <button className="bg-transparent border-none text-slate-500 hover:text-white cursor-pointer p-1 rounded hover:bg-white/5 transition-all w-6 h-6 flex items-center justify-center" onClick={onClose}>✕</button>
        </div>
        
        <div className="flex-1 flex relative justify-center items-center min-h-[300px] p-6 bg-slate-950/30">
          {/* Left Arrow */}
          {previewGroup.length > 1 && (
            <button 
              className="absolute left-4 text-white bg-slate-950/60 border border-white/5 hover:bg-slate-950 transition-all rounded-full w-10 h-10 flex items-center justify-center z-10 cursor-pointer text-base"
              onClick={() => setPreviewIndex(prev => (prev - 1 + previewGroup.length) % previewGroup.length)}
            >
              ◀
            </button>
          )}

          {/* Preview Content */}
          {currentFile.isImage ? (
            <img 
              src={currentFile.url} 
              alt={currentFile.name} 
              className="max-w-full max-h-[50vh] rounded-xl object-contain shadow-2xl border border-white/5"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <span className="text-7xl">📄</span>
              <span className="text-sm font-medium text-slate-300 text-center max-w-md break-all">
                {currentFile.name}
              </span>
              <a 
                href={currentFile.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-2"
                style={{ textDecoration: 'none' }}
              >
                <span>📥</span> Download / Open File
              </a>
            </div>
          )}

          {/* Right Arrow */}
          {previewGroup.length > 1 && (
            <button 
              className="absolute right-4 text-white bg-slate-950/60 border border-white/5 hover:bg-slate-950 transition-all rounded-full w-10 h-10 flex items-center justify-center z-10 cursor-pointer text-base"
              onClick={() => setPreviewIndex(prev => (prev + 1) % previewGroup.length)}
            >
              ▶
            </button>
          )}
        </div>

        {/* Thumbnail list */}
        {previewGroup.length > 1 && (
          <div className="flex gap-2 justify-center p-4 border-t border-white/5 overflow-x-auto bg-slate-950/20">
            {previewGroup.map((file, idx) => (
              <div 
                key={idx} 
                className={`cursor-pointer border-2 rounded-lg p-0.5 transition-all bg-white/5 ${idx === previewIndex ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                onClick={() => setPreviewIndex(idx)}
              >
                {file.isImage ? (
                  <img src={file.url} alt={file.name} className="w-10 h-10 object-cover rounded-md" />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center text-xl">📄</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default AttachmentPreview;
