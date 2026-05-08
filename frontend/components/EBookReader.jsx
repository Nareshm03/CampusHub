'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Bookmark, BookmarkCheck, 
         MessageSquare, Download, Search, Menu, X, Settings } from 'lucide-react';

export function PDFReader({ fileUrl, bookId, initialPage = 1, totalPages, onProgressUpdate }) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Load PDF using external library or iframe
    // For production, use PDF.js or react-pdf
  }, [fileUrl]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      if (onProgressUpdate) {
        onProgressUpdate(newPage);
      }
    }
  };

  const handleZoom = (direction) => {
    if (direction === 'in' && zoom < 3) {
      setZoom(zoom + 0.25);
    } else if (direction === 'out' && zoom > 0.5) {
      setZoom(zoom - 0.25);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gray-900"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Top Controls */}
      <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="p-2 hover:bg-white/20 rounded">
              <X size={24} />
            </button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => handleZoom('out')} className="p-2 hover:bg-white/20 rounded">
              <ZoomOut size={20} />
            </button>
            <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => handleZoom('in')} className="p-2 hover:bg-white/20 rounded">
              <ZoomIn size={20} />
            </button>
            <button className="p-2 hover:bg-white/20 rounded">
              <Search size={20} />
            </button>
            <button className="p-2 hover:bg-white/20 rounded">
              <Bookmark size={20} />
            </button>
            <button className="p-2 hover:bg-white/20 rounded">
              <Download size={20} />
            </button>
            <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="w-full h-full flex items-center justify-center overflow-auto">
        <iframe
          src={`${fileUrl}#page=${currentPage}`}
          className="w-full h-full"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        />
      </div>

      {/* Bottom Navigation */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full text-white">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => handlePageChange(parseInt(e.target.value))}
              className="w-16 bg-transparent text-center outline-none"
              min={1}
              max={totalPages}
            />
            <span>/ {totalPages}</span>
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Page Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(currentPage / totalPages) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function EPUBReader({ fileUrl, bookId, onProgressUpdate }) {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('light');
  const [showMenu, setShowMenu] = useState(false);

  const themes = {
    light: 'bg-white text-gray-900',
    sepia: 'bg-amber-50 text-gray-800',
    dark: 'bg-gray-900 text-gray-100'
  };

  return (
    <div className={`w-full h-screen ${themes[theme]} transition-colors duration-300`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={() => window.history.back()}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-medium">Chapter {currentChapter + 1}</h1>
        <button onClick={() => setShowMenu(!showMenu)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Reader Content */}
      <div 
        className="max-w-3xl mx-auto px-6 py-8 overflow-y-auto"
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
      >
        {/* EPUB content would be rendered here */}
        {/* Use epubjs library for production */}
        <div className="prose prose-lg max-w-none">
          {/* Content placeholder */}
        </div>
      </div>

      {/* Settings Menu */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center">
          <div className={`${themes[theme]} w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 space-y-6`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Reading Settings</h2>
              <button onClick={() => setShowMenu(false)}>
                <X size={24} />
              </button>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium mb-2">Font Size</label>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  A-
                </button>
                <span className="flex-1 text-center">{fontSize}px</span>
                <button 
                  onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 p-3 rounded border-2 ${theme === 'light' ? 'border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-8 bg-white rounded mb-1"></div>
                  <span className="text-xs">Light</span>
                </button>
                <button
                  onClick={() => setTheme('sepia')}
                  className={`flex-1 p-3 rounded border-2 ${theme === 'sepia' ? 'border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-8 bg-amber-50 rounded mb-1"></div>
                  <span className="text-xs">Sepia</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 p-3 rounded border-2 ${theme === 'dark' ? 'border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-8 bg-gray-900 rounded mb-1"></div>
                  <span className="text-xs">Dark</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        <button 
          onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
          className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
        >
          Previous
        </button>
        <button 
          onClick={() => setCurrentChapter(currentChapter + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function BookmarkPanel({ bookmarks, onBookmarkClick, onBookmarkDelete }) {
  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BookmarkCheck size={20} className="text-blue-500" />
        Bookmarks
      </h3>
      
      {bookmarks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No bookmarks yet</p>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bookmark, index) => (
            <div 
              key={index}
              className="flex items-start justify-between p-3 hover:bg-gray-50 rounded cursor-pointer"
              onClick={() => onBookmarkClick(bookmark.page)}
            >
              <div className="flex-1">
                <div className="font-medium text-sm">Page {bookmark.page}</div>
                {bookmark.note && (
                  <div className="text-xs text-gray-600 mt-1">{bookmark.note}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(bookmark.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmarkDelete(bookmark._id);
                }}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnnotationPanel({ annotations, onAnnotationClick, onAnnotationDelete }) {
  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageSquare size={20} className="text-green-500" />
        Annotations
      </h3>
      
      {annotations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No annotations yet</p>
      ) : (
        <div className="space-y-3">
          {annotations.map((annotation, index) => (
            <div 
              key={index}
              className="p-3 border-l-4 hover:bg-gray-50 rounded cursor-pointer"
              style={{ borderColor: annotation.color }}
              onClick={() => onAnnotationClick(annotation.page)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">Page {annotation.page}</div>
                  {annotation.highlightedText && (
                    <div className="text-sm mt-1 p-2 bg-yellow-50 rounded">
                      "{annotation.highlightedText}"
                    </div>
                  )}
                  {annotation.text && (
                    <div className="text-sm text-gray-600 mt-2">{annotation.text}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(annotation.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnnotationDelete(annotation._id);
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReadingProgress({ current, total, percentage, timeSpent }) {
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="font-semibold text-lg">Reading Progress</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Page {current} of {total}</span>
          <span className="font-medium">{percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {timeSpent > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Time spent reading:</span>
          <span className="font-medium">{formatTime(timeSpent)}</span>
        </div>
      )}
    </div>
  );
}
