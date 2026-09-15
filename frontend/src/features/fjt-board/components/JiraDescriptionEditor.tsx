import React, { useState, useRef, useCallback } from 'react';
import {
  Heading,
  Bold,
  Italic,
  Quote,
  Code,
  Link,
  List,
  ListOrdered,
  CheckSquare,
  Paperclip,
  AtSign,
  Image as ImageIcon,
  Smile,
  Table,
  Check,
  MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// In-memory cache + persistent LocalStorage for clean image asset URLs
const ASSET_STORAGE_PREFIX = 'airm_asset_';
const memoryAssetCache = new Map<string, string>();

export const saveLocalAsset = (assetUrl: string, base64: string) => {
  memoryAssetCache.set(assetUrl, base64);
  try {
    const key = ASSET_STORAGE_PREFIX + assetUrl;
    localStorage.setItem(key, base64);
  } catch (err) {
    // LocalStorage quota might be full; memory cache will serve current session
  }
};

export const resolveLocalAsset = (url: string): string => {
  if (!url) return '';
  if (memoryAssetCache.has(url)) return memoryAssetCache.get(url)!;
  try {
    const stored = localStorage.getItem(ASSET_STORAGE_PREFIX + url);
    if (stored) {
      memoryAssetCache.set(url, stored);
      return stored;
    }
  } catch {}
  return url;
};

// Helper to ensure external links start with https:// if no protocol is given
export const normalizeMarkdownLink = (rawUrl: string): string => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '#';
  if (/^(https?:\/\/|mailto:|tel:|sms:|ftp:\/\/|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

interface JiraDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  placeholder?: string;
  showCommentButton?: boolean;
}

export const JiraDescriptionEditor: React.FC<JiraDescriptionEditorProps> = ({
  value,
  onChange,
  onSave,
  placeholder = 'Add your description here...',
  showCommentButton = true,
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to insert markdown syntax at cursor position
  const insertText = useCallback(
    (prefix: string, suffix = '', defaultText = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || defaultText;
      const replacement = `${prefix}${selectedText}${suffix}`;

      const newValue = value.substring(0, start) + replacement + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + selectedText.length
        );
      }, 10);
    },
    [value, onChange]
  );

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Insert image directly into markdown at cursor with clean 1-line asset URL (GitHub style)
  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setIsUploading(true);

    for (const file of fileList) {
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        // Generate clean unique 1-line asset identifier
        const assetId = `${Math.random().toString(36).substring(2, 10)}-${Math.random().toString(36).substring(2, 6)}-${Date.now().toString(36)}`;
        const cleanUrl = `https://airm.assets/images/${assetId}.png`;
        saveLocalAsset(cleanUrl, base64);

        const cleanName = file.name || 'image.png';
        const imageMarkdown = `\n![${cleanName}](${cleanUrl})\n`;
        insertText(imageMarkdown, '', '');
      } else {
        // Non-image attachments as file links
        const base64 = await fileToBase64(file);
        const assetId = `${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
        const cleanUrl = `https://airm.assets/files/${assetId}/${encodeURIComponent(file.name)}`;
        saveLocalAsset(cleanUrl, base64);

        const fileMarkdown = `\n[📎 ${file.name}](${cleanUrl})\n`;
        insertText(fileMarkdown, '', '');
      }
    }

    setIsUploading(false);
  };

  const handleCommentSave = () => {
    if (onSave) {
      onSave(value);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
    toast({
      title: 'Comment / Description saved',
      description: 'Your description content has been saved successfully.',
    });
  };

  // Handle Clipboard Paste (like GitHub Issues - Ctrl+V with image screenshots)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      await processFiles(imageFiles);
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleToggleTaskItem = (lineIdx: number) => {
    const lines = value.split('\n');
    if (lineIdx >= 0 && lineIdx < lines.length) {
      const target = lines[lineIdx];
      if (target.includes('- [ ]')) {
        lines[lineIdx] = target.replace('- [ ]', '- [x]');
      } else if (target.includes('- [x]')) {
        lines[lineIdx] = target.replace('- [x]', '- [ ]');
      } else if (target.includes('- [X]')) {
        lines[lineIdx] = target.replace('- [X]', '- [ ]');
      }
      onChange(lines.join('\n'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = value.substring(0, cursorPos);
      const textAfter = value.substring(cursorPos);

      // Find current line
      const lastNewline = textBefore.lastIndexOf('\n');
      const currentLine = lastNewline === -1 ? textBefore : textBefore.substring(lastNewline + 1);

      // 1. Task list item: e.g. "- [ ] " or "- [x] "
      const taskMatch = currentLine.match(/^(\s*-\s*\[[ xX]\]\s*)(.*)$/);
      if (taskMatch) {
        e.preventDefault();
        const content = taskMatch[2];

        // If empty task item, pressing Enter cancels the sequence
        if (!content.trim()) {
          const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
          const newText = value.substring(0, lineStart) + textAfter;
          onChange(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          }, 0);
          return;
        }

        const insertion = `\n- [ ] `;
        const newText = textBefore + insertion + textAfter;
        onChange(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + insertion.length;
        }, 0);
        return;
      }

      // 2. Bullet list item: e.g. "- " or "* "
      const bulletMatch = currentLine.match(/^(\s*[-*]\s+)(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const prefix = bulletMatch[1];
        const content = bulletMatch[2];

        // If empty bullet, pressing Enter cancels the sequence
        if (!content.trim()) {
          const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
          const newText = value.substring(0, lineStart) + textAfter;
          onChange(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          }, 0);
          return;
        }

        const bulletChar = prefix.trim()[0];
        const indentation = prefix.match(/^\s*/)?.[0] || '';
        const insertion = `\n${indentation}${bulletChar} `;
        const newText = textBefore + insertion + textAfter;
        onChange(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + insertion.length;
        }, 0);
        return;
      }

      // 3. Numbered list item: e.g. "1. " or "2. "
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        e.preventDefault();
        const indentation = numMatch[1];
        const currentNum = parseInt(numMatch[2], 10);
        const content = numMatch[3];

        // If empty number item, pressing Enter cancels the sequence
        if (!content.trim()) {
          const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
          const newText = value.substring(0, lineStart) + textAfter;
          onChange(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          }, 0);
          return;
        }

        const nextNum = currentNum + 1;
        const insertion = `\n${indentation}${nextNum}. `;
        const newText = textBefore + insertion + textAfter;
        onChange(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + insertion.length;
        }, 0);
        return;
      }

      // 4. Table row item: e.g. "| Header 1 | Header 2 |"
      if (currentLine.trim().startsWith('|') && currentLine.trim().endsWith('|')) {
        e.preventDefault();
        const cells = currentLine.trim().split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const isAllEmpty = cells.every((c) => !c.trim());

        // If empty row, stop table continuation
        if (isAllEmpty && currentLine.includes('|   |')) {
          const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
          const newText = value.substring(0, lineStart) + '\n' + textAfter;
          onChange(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart + 1;
          }, 0);
          return;
        }

        const numCols = cells.length > 0 ? cells.length : 2;
        const emptyRow = `\n| ${Array(numCols).fill('   ').join(' | ')} |`;
        const newText = textBefore + emptyRow + textAfter;
        onChange(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + 3;
        }, 0);
        return;
      }
    }
  };

  // Inline markdown renderer helper for bold, italic, code, links, mentions, and plain URLs
  const renderInline = (line: string): React.ReactNode => {
    const regex = /(\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`|\[.*?\]\(.*?\)|\@\w+[\w.-]*|https?:\/\/[^\s<>"')]+|www\.[^\s<>"')]+)/gi;
    const parts = line.split(regex);

    return (
      <>
        {parts.map((part, pIdx) => {
          if (!part) return null;
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return <strong key={pIdx} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return <em key={pIdx} className="italic text-gray-800">{part.slice(1, -1)}</em>;
          }
          if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
            return <del key={pIdx} className="line-through text-gray-500">{part.slice(2, -2)}</del>;
          }
          if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            return (
              <code key={pIdx} className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-[11px] border border-gray-200">
                {part.slice(1, -1)}
              </code>
            );
          }
          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (linkMatch) {
            const safeHref = normalizeMarkdownLink(linkMatch[2]);
            return (
              <a
                key={pIdx}
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline font-medium hover:text-blue-800 cursor-pointer break-all"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(safeHref, '_blank', 'noopener,noreferrer');
                }}
              >
                {linkMatch[1]}
              </a>
            );
          }
          if (/^(https?:\/\/|www\.)/i.test(part)) {
            const safeHref = normalizeMarkdownLink(part);
            return (
              <a
                key={pIdx}
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline font-medium hover:text-blue-800 cursor-pointer break-all"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(safeHref, '_blank', 'noopener,noreferrer');
                }}
              >
                {part}
              </a>
            );
          }
          if (part.startsWith('@')) {
            return (
              <span key={pIdx} className="font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                {part}
              </span>
            );
          }
          return part;
        })}
      </>
    );
  };

  // Markdown renderer for Preview mode
  const renderMarkdown = (text: string) => {
    if (!text.trim()) {
      return <p className="text-gray-400 italic text-xs py-4">Nothing to preview</p>;
    }

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockBuffer: string[] = [];

    lines.forEach((line, idx) => {
      // Code block start/end ```
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${idx}`} className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto my-2 border border-gray-800">
              <code>{codeBlockBuffer.join('\n')}</code>
            </pre>
          );
          codeBlockBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockBuffer = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockBuffer.push(line);
        return;
      }

      // Images: ![alt](url)
      const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        const alt = imgMatch[1];
        const resolvedSrc = resolveLocalAsset(imgMatch[2]);
        elements.push(
          <div key={idx} className="my-2 p-1 border rounded-lg bg-gray-50 max-w-lg inline-block shadow-xs">
            <img
              src={resolvedSrc}
              alt={alt}
              className="max-h-72 rounded object-contain"
            />
            {alt && <p className="text-[10px] text-gray-500 mt-1 text-center font-medium">{alt}</p>}
          </div>
        );
        return;
      }

      // HTML Image Tag: <img src="..." alt="..." />
      const htmlImgMatch = line.match(/<img\s+[^>]*src=["'](.*?)["'][^>]*\/?>(?:<\/img>)?/i);
      if (htmlImgMatch) {
        const resolvedSrc = resolveLocalAsset(htmlImgMatch[1]);
        const altMatch = line.match(/alt=["'](.*?)["']/i);
        const alt = altMatch ? altMatch[1] : '';
        elements.push(
          <div key={idx} className="my-2 p-1 border rounded-lg bg-gray-50 max-w-lg inline-block shadow-xs">
            <img
              src={resolvedSrc}
              alt={alt}
              className="max-h-72 rounded object-contain"
            />
            {alt && <p className="text-[10px] text-gray-500 mt-1 text-center font-medium">{alt}</p>}
          </div>
        );
        return;
      }

      // File attachment link: [📎 name](url)
      const fileMatch = line.match(/^\[📎\s*(.*?)\]\((.*?)\)$/);
      if (fileMatch) {
        const resolvedHref = resolveLocalAsset(fileMatch[2]);
        elements.push(
          <div key={idx} className="my-1.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 border text-xs text-blue-600 font-medium">
            <Paperclip className="h-3.5 w-3.5 text-gray-500" />
            <a href={resolvedHref} download={fileMatch[1]} className="hover:underline">{fileMatch[1]}</a>
          </div>
        );
        return;
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(<h4 key={idx} className="font-bold text-sm text-gray-900 mt-2 mb-1">{renderInline(line.slice(4))}</h4>);
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(<h3 key={idx} className="font-bold text-base text-gray-900 mt-3 mb-1">{renderInline(line.slice(3))}</h3>);
        return;
      }
      if (line.startsWith('# ')) {
        elements.push(<h2 key={idx} className="font-extrabold text-lg text-gray-900 mt-3 mb-1">{renderInline(line.slice(2))}</h2>);
        return;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="border-l-4 border-gray-300 bg-gray-50/70 pl-3 py-1 text-xs text-gray-700 italic my-1 rounded-r">
            {renderInline(line.slice(2))}
          </blockquote>
        );
        return;
      }

      // Checklist item
      const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)/);
      if (taskMatch) {
        const checked = taskMatch[2].toLowerCase() === 'x';
        const text = taskMatch[3];
        elements.push(
          <div key={idx} className="flex items-center gap-2 text-xs text-gray-800 my-1">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => handleToggleTaskItem(idx)}
              className="rounded text-blue-600 h-3.5 w-3.5 cursor-pointer"
            />
            <span className={checked ? 'line-through text-gray-400' : ''}>{renderInline(text)}</span>
          </div>
        );
        return;
      }

      // Numbered list: 1. Item
      const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const num = numMatch[2];
        const text = numMatch[3];
        elements.push(
          <div key={idx} className="flex items-start gap-1.5 ml-4 my-0.5 text-xs text-gray-800">
            <span className="font-semibold text-gray-700 select-none min-w-[1.25rem] text-right">{num}.</span>
            <span className="flex-1">{renderInline(text)}</span>
          </div>
        );
        return;
      }

      // Bullet List
      if (/^\s*[-*]\s+(.*)/.test(line)) {
        const text = line.replace(/^\s*[-*]\s+/, '');
        elements.push(
          <div key={idx} className="flex items-start gap-2 ml-4 my-0.5 text-xs text-gray-800">
            <span className="text-gray-600 font-bold select-none">•</span>
            <span className="flex-1">{renderInline(text)}</span>
          </div>
        );
        return;
      }

      // Table Row
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (line.includes('---')) {
          return;
        }
        elements.push(
          <div key={idx} className="grid grid-flow-col auto-cols-fr gap-2 bg-gray-50 border p-1 text-xs text-gray-800 my-0.5 font-mono">
            {cells.map((cell, cIdx) => (
              <span key={cIdx} className="font-medium p-1 truncate">{renderInline(cell.trim())}</span>
            ))}
          </div>
        );
        return;
      }

      // Paragraph / spacing
      if (line.trim() === '') {
        elements.push(<div key={idx} className="h-2" />);
      } else {
        elements.push(<p key={idx} className="text-xs text-gray-800 leading-relaxed">{renderInline(line)}</p>);
      }
    });

    if (inCodeBlock && codeBlockBuffer.length > 0) {
      elements.push(
        <pre key="code-final" className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto my-2 border border-gray-800">
          <code>{codeBlockBuffer.join('\n')}</code>
        </pre>
      );
    }

    return <div className="space-y-1">{elements}</div>;
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-700">Description</label>

      {/* GitHub Style Markdown Container */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        {/* Top Header: Tabs on Left + Markdown Toolbar on Right */}
        <div className="bg-gray-50/90 border-b border-gray-200 px-3 py-1 flex items-center justify-between flex-wrap gap-2 select-none">
          {/* Left: Write / Preview Tabs (Exact GitHub Style) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'write'
                  ? 'bg-white text-gray-900 border border-gray-200 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white text-gray-900 border border-gray-200 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Right: Markdown Action Icons */}
          {activeTab === 'write' && (
            <div className="flex items-center gap-0.5 text-gray-600">
              {/* Heading */}
              <button
                type="button"
                onClick={() => insertText('### ', '', 'Heading')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700 font-bold text-xs"
                title="Heading (H)"
              >
                H
              </button>

              {/* Bold */}
              <button
                type="button"
                onClick={() => insertText('**', '**', 'bold text')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Bold (B)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>

              {/* Italic */}
              <button
                type="button"
                onClick={() => insertText('*', '*', 'italic text')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Italic (I)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>

              {/* Quote */}
              <button
                type="button"
                onClick={() => insertText('> ', '', 'quote')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Quote"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>

              {/* Code */}
              <button
                type="button"
                onClick={() => insertText('`', '`', 'code')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Code"
              >
                <Code className="h-3.5 w-3.5" />
              </button>

              {/* Link */}
              <button
                type="button"
                onClick={() => insertText('[', '](https://)', 'title')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Link"
              >
                <Link className="h-3.5 w-3.5" />
              </button>

              <span className="h-3.5 w-[1px] bg-gray-300 mx-1" />

              {/* Bullet List */}
              <button
                type="button"
                onClick={() => insertText('- ', '', 'item')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Unordered list"
              >
                <List className="h-3.5 w-3.5" />
              </button>

              {/* Numbered List */}
              <button
                type="button"
                onClick={() => insertText('1. ', '', 'item')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Ordered list"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>

              {/* Task List */}
              <button
                type="button"
                onClick={() => insertText('- [ ] ', '', 'task')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Task list"
              >
                <CheckSquare className="h-3.5 w-3.5" />
              </button>

              <span className="h-3.5 w-[1px] bg-gray-300 mx-1" />

              {/* Table */}
              <button
                type="button"
                onClick={() =>
                  insertText(
                    '\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n',
                    '',
                    ''
                  )
                }
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Add Table"
              >
                <Table className="h-3.5 w-3.5" />
              </button>

              {/* Attach File / Image Click */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Attach files (images, documents)"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>

              {/* Mention */}
              <button
                type="button"
                onClick={() => insertText('@', '', 'username')}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                title="Mention someone"
              >
                <AtSign className="h-3.5 w-3.5" />
              </button>

              {/* Emoji */}
              <DropdownMenu>
                <DropdownMenuTrigger className="p-1.5 hover:bg-gray-200 rounded text-gray-700">
                  <Smile className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white p-2 text-base grid grid-cols-5 gap-1">
                  {['👍', '🚀', '🐛', '✅', '⚠️', '🔥', '💡', '🎉', '📌', '⚡'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertText(`${emoji} `, '', '')}
                      className="p-1.5 hover:bg-gray-100 rounded text-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Hidden File Input for Paperclip / Click to add files */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          multiple
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
        />

        {/* Editor Body */}
        {activeTab === 'write' ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative"
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              rows={7}
              className={`w-full p-3 text-xs text-gray-900 border-0 focus:ring-0 resize-y font-mono outline-none ${
                isDraggingOver ? 'bg-blue-50/50' : 'bg-white'
              }`}
            />

            {/* Dragging over overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 bg-blue-50/90 border-2 border-dashed border-blue-500 rounded flex items-center justify-center pointer-events-none z-10">
                <p className="text-xs font-bold text-blue-700">Drop files here to attach to description</p>
              </div>
            )}

            {/* Bottom GitHub Footer: Markdown support + Paste/Drop/Click to add files */}
            <div className="px-3 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span className="flex items-center gap-1 font-medium text-gray-600">
                <span className="font-bold border border-gray-300 rounded px-1 py-0.2 text-[9px] bg-gray-100">M↓</span>
                Markdown is supported
              </span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 font-medium cursor-pointer transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600" />
                <span>
                  {isUploading ? 'Uploading file...' : 'Paste, drop, or click to add files'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Preview Body */
          <div className="p-4 min-h-[160px] max-h-80 overflow-y-auto bg-gray-50/30">
            {renderMarkdown(value)}
          </div>
        )}
      </div>

      {/* GitHub-style Comment / Save Action Bar */}
      {showCommentButton && (
        <div className="flex items-center justify-between pt-1.5 px-0.5">
          <p className="text-[11px] text-gray-500">
            {isSaved ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Description saved
              </span>
            ) : (
              <span>Write & preview supported</span>
            )}
          </p>

          <Button
            type="button"
            size="sm"
            onClick={handleCommentSave}
            className="bg-[#2da44e] hover:bg-[#2c974b] text-white font-semibold text-xs px-3.5 py-1.5 h-7 rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            Comment
          </Button>
        </div>
      )}
    </div>
  );
};
