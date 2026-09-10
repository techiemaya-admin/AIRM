import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  Pencil,
  Trash2,
  CornerDownRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { FjtComment, FjtMember } from '@/sdk/features/fjt-board';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUsers } from '@/hooks/useUsers';

// Helper: Format GitHub timestamp:
// If < 24h -> "30 minutes ago" / "3 hours ago" / "just now"
// If >= 24h -> "Sep 08" or "Sep 08, 2026"
export function formatGithubTimestamp(isoString?: string): string {
  if (!isoString) return 'just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'just now';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) {
      return 'just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');

    if (date.getFullYear() === now.getFullYear()) {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${date.getFullYear()}`;
  } catch {
    return 'just now';
  }
}

// In-memory + LocalStorage cache for attachments/images
const ASSET_STORAGE_PREFIX = 'airm_asset_';
const memoryAssetCache = new Map<string, string>();

export const saveLocalAsset = (assetUrl: string, base64: string) => {
  memoryAssetCache.set(assetUrl, base64);
  try {
    localStorage.setItem(ASSET_STORAGE_PREFIX + assetUrl, base64);
  } catch {}
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

export const normalizeMarkdownLink = (rawUrl: string): string => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '#';
  if (/^(https?:\/\/|mailto:|tel:|sms:|ftp:\/\/|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

// Markdown Renderer Helper (GitHub-compatible)
export function renderMarkdown(content: string, onToggleTask?: (lineIndex: number) => void) {
  if (!content || !content.trim()) {
    return <p className="text-gray-400 italic text-xs">No description provided.</p>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (keyIndex: number) => {
    if (tableRows.length === 0) return;
    const [headerRow, ...bodyRows] = tableRows;
    const cleanBodyRows = bodyRows.filter(
      (r) => !r.every((cell) => cell.replace(/[-:]/g, '').trim() === '')
    );

    elements.push(
      <div key={`table-${keyIndex}`} className="my-2.5 overflow-x-auto border border-gray-200 rounded-md shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          {headerRow && (
            <thead className="bg-gray-100 text-gray-800 border-b border-gray-200">
              <tr>
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="px-3 py-2 font-semibold border-r border-gray-200 last:border-r-0">
                    {formatInlineText(cell)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {cleanBodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-50/80">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-1.5 border-r border-gray-100 last:border-r-0 text-gray-700">
                    {formatInlineText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  const formatInlineText = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyCounter = 0;

    while (remaining.length > 0) {
      // 1. Image: ![alt](url)
      const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        const alt = imgMatch[1];
        const rawSrc = imgMatch[2];
        const src = resolveLocalAsset(rawSrc);

        parts.push(
          <div key={`img-${keyCounter++}`} className="my-2 inline-block max-w-full">
            <img
              src={src}
              alt={alt}
              className="max-h-72 max-w-full rounded-md border border-gray-200 shadow-xs object-contain cursor-zoom-in hover:brightness-95 transition-all bg-white"
              onClick={() => window.open(src, '_blank')}
            />
            {alt && <span className="block text-[11px] text-gray-400 mt-0.5">{alt}</span>}
          </div>
        );
        remaining = remaining.substring(imgMatch[0].length);
        continue;
      }

      // 2. Link: [label](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const label = linkMatch[1];
        const rawHref = linkMatch[2];
        const href = resolveLocalAsset(rawHref);
        const safeUrl = normalizeMarkdownLink(href);

        parts.push(
          <a
            key={`lnk-${keyCounter++}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-0.5 break-all cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              window.open(safeUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            <span>{label}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-70 ml-0.5" />
          </a>
        );
        remaining = remaining.substring(linkMatch[0].length);
        continue;
      }

      // 2b. Direct / Plain URL: https://... or http://... or www....
      const rawUrlMatch = remaining.match(/^(https?:\/\/[^\s<>"')]+|www\.[^\s<>"')]+)/i);
      if (rawUrlMatch) {
        const rawUrl = rawUrlMatch[1];
        const safeUrl = normalizeMarkdownLink(rawUrl);

        parts.push(
          <a
            key={`raw-url-${keyCounter++}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-1 break-all cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              window.open(safeUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            <span>{rawUrl}</span>
            <ExternalLink className="h-3 w-3 text-blue-500 inline-block flex-shrink-0" />
          </a>
        );
        remaining = remaining.substring(rawUrl.length);
        continue;
      }

      // 3. Bold: **text**
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(<strong key={`b-${keyCounter++}`} className="font-bold text-gray-900">{boldMatch[1]}</strong>);
        remaining = remaining.substring(boldMatch[0].length);
        continue;
      }

      // 4. Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
      if (italicMatch) {
        parts.push(<em key={`i-${keyCounter++}`} className="italic">{italicMatch[2]}</em>);
        remaining = remaining.substring(italicMatch[0].length);
        continue;
      }

      // 5. Code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code key={`c-${keyCounter++}`} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-[11px] text-pink-600">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.substring(codeMatch[0].length);
        continue;
      }

      // 6. Mention: @username or @firstname.lastname
      const mentionMatch = remaining.match(/^@([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)/);
      if (mentionMatch) {
        parts.push(
          <span key={`m-${keyCounter++}`} className="font-semibold text-blue-700 bg-blue-50 px-1 py-0.2 rounded">
            @{mentionMatch[1]}
          </span>
        );
        remaining = remaining.substring(mentionMatch[0].length);
        continue;
      }

      // Plain char
      const nextSpecial = remaining.search(/([!\[*_`@]|https?:\/\/|www\.)/i);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        parts.push(remaining[0]);
        remaining = remaining.substring(1);
      } else {
        parts.push(remaining.substring(0, nextSpecial));
        remaining = remaining.substring(nextSpecial);
      }
    }

    return parts;
  };

  lines.forEach((line, index) => {
    // Code block ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${index}`} className="p-3 bg-gray-900 text-gray-100 rounded-md text-xs font-mono overflow-x-auto my-2 shadow-xs">
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushTable(index);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Markdown Table | col | col |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      inTable = true;
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(index);
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={index} className="text-lg font-bold text-gray-900 mt-3 mb-1.5 border-b border-gray-100 pb-1">{formatInlineText(line.substring(2))}</h1>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={index} className="text-base font-bold text-gray-900 mt-2.5 mb-1">{formatInlineText(line.substring(3))}</h2>);
      return;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={index} className="text-sm font-bold text-gray-800 mt-2 mb-1">{formatInlineText(line.substring(4))}</h3>);
      return;
    }

    // Blockquote >
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={index} className="border-l-4 border-gray-300 pl-3 py-1 text-gray-600 italic my-2 bg-gray-50/50 rounded-r text-xs">
          {formatInlineText(line.substring(2))}
        </blockquote>
      );
      return;
    }

    // Task list - [ ] or - [x]
    const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const text = taskMatch[3];
      elements.push(
        <div key={index} className="flex items-center gap-2 my-1 text-xs text-gray-800">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleTask && onToggleTask(index)}
            className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5 cursor-pointer focus:ring-blue-500"
          />
          <span className={isChecked ? 'line-through text-gray-400' : ''}>{formatInlineText(text)}</span>
        </div>
      );
      return;
    }

    // Numbered list: 1. Item (Exact sequence, independent of HTML list counters)
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[2];
      const text = numMatch[3];
      elements.push(
        <div key={index} className="flex items-start gap-1.5 ml-4 my-0.5 text-xs text-gray-800">
          <span className="font-semibold text-gray-700 select-none min-w-[1.25rem] text-right">{num}.</span>
          <span className="flex-1">{formatInlineText(text)}</span>
        </div>
      );
      return;
    }

    // Bullet list: - Item or * Item
    if (/^\s*[-*]\s+(.*)/.test(line)) {
      const text = line.replace(/^\s*[-*]\s+/, '');
      elements.push(
        <div key={index} className="flex items-start gap-2 ml-4 my-0.5 text-xs text-gray-800">
          <span className="text-gray-600 font-bold select-none">•</span>
          <span className="flex-1">{formatInlineText(text)}</span>
        </div>
      );
      return;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={index} className="text-xs text-gray-800 leading-relaxed my-1">
        {formatInlineText(line)}
      </p>
    );
  });

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className="space-y-1">{elements}</div>;
}

// -------------------------------------------------------------
// Interactive GitHub Markdown Editor Box (Write / Preview)
// -------------------------------------------------------------
interface MarkdownEditorBoxProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export const MarkdownEditorBox: React.FC<MarkdownEditorBoxProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Comment',
  placeholder = 'Leave a comment or description...',
  autoFocus = false,
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // Employee suggestions from DB / Users
  const { data: dbUsers = [] } = useUsers();
  const employeeSuggestions = useMemo(() => {
    if (dbUsers && dbUsers.length > 0) {
      return dbUsers.map((u: any) => {
        const emailPrefix = u.email ? u.email.split('@')[0] : '';
        const username = emailPrefix || (u.full_name || u.name || 'user').toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '-');
        return {
          id: String(u.id || u.user_id),
          username,
          full_name: u.full_name || u.name || username,
          email: u.email || '',
          initials: (u.full_name || u.name || username)
            .split(' ')
            .filter(Boolean)
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U',
        };
      });
    }
    return [
      { id: 'usr-1', username: 'chethanreddyp-techiemaya', full_name: 'PAGALA CHETHAN REDDY', email: 'chethan.p@techiemaya.com', initials: 'PC' },
      { id: 'usr-2', username: 'Shayan-techiemaya', full_name: 'Shayan', email: 'shayan@techiemaya.com', initials: 'SH' },
      { id: 'usr-3', username: 'actions-user', full_name: 'Actions User', email: 'actions@techiemaya.com', initials: 'AU' },
      { id: 'usr-4', username: 'sandhanisk', full_name: 'Sandhani SK', email: 'sandhani@techiemaya.com', initials: 'SK' },
      { id: 'usr-5', username: 'naveentechiemaya', full_name: 'Naveen', email: 'naveen@techiemaya.com', initials: 'NV' },
      { id: 'usr-6', username: 'Nikita-S', full_name: 'Nikita S', email: 'nikita.s@techiemaya.com', initials: 'NS' },
      { id: 'usr-7', username: 'Davood-K', full_name: 'Davood K', email: 'davood.k@techiemaya.com', initials: 'DK' },
      { id: 'usr-8', username: 'Sahil-T', full_name: 'Sahil T', email: 'sahil.t@techiemaya.com', initials: 'ST' },
    ];
  }, [dbUsers]);

  // Mention popup state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState<number>(0);

  // Check if cursor is currently immediately after an '@' or '@...'
  const checkMentionTrigger = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    const match = textBeforeCursor.match(/(?:^|[\s\n])@([a-zA-Z0-9_.-]*)$/);
    if (match) {
      const q = match[1];
      const atIdx = textBeforeCursor.lastIndexOf('@');
      setMentionQuery(q);
      setMentionStartIndex(atIdx);
      setSelectedMentionIdx(0);
    } else {
      setMentionQuery(null);
      setMentionStartIndex(-1);
    }
  }, []);

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    if (!q) return employeeSuggestions;
    return employeeSuggestions.filter(
      (emp) =>
        emp.username.toLowerCase().includes(q) ||
        emp.full_name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q)
    );
  }, [mentionQuery, employeeSuggestions]);

  const handleSelectMention = useCallback(
    (emp: { username: string; full_name: string }) => {
      const textarea = textareaRef.current;
      if (!textarea || mentionStartIndex === -1) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = value.substring(0, mentionStartIndex);
      const textAfter = value.substring(cursorPos);
      const mentionText = `@${emp.username} `;

      const newText = textBefore + mentionText + textAfter;
      onChange(newText);
      setMentionQuery(null);
      setMentionStartIndex(-1);

      setTimeout(() => {
        textarea.focus();
        const nextPos = mentionStartIndex + mentionText.length;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 10);
    },
    [value, mentionStartIndex, onChange]
  );

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setIsUploading(true);

    for (const file of fileList) {
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        const assetId = `${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
        const cleanUrl = `https://airm.assets/images/${assetId}.png`;
        saveLocalAsset(cleanUrl, base64);
        const imageMarkdown = `\n![${file.name || 'image.png'}](${cleanUrl})\n`;
        insertText(imageMarkdown, '', '');
      } else {
        const base64 = await fileToBase64(file);
        const assetId = `${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
        const cleanUrl = `https://airm.assets/files/${assetId}/${encodeURIComponent(file.name)}`;
        saveLocalAsset(cleanUrl, base64);
        const fileMarkdown = `\n[📎 ${file.name}](${cleanUrl})\n`;
        insertText(fileMarkdown, '', '');
      }
    }

    setIsUploading(false);
    toast({ title: 'File attached to markdown' });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const filesToUpload: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) filesToUpload.push(file);
      }
    }
    if (filesToUpload.length > 0) {
      processFiles(filesToUpload);
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
    // Keyboard navigation for mention autocomplete popup
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(filteredMentions[selectedMentionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = value.substring(0, cursorPos);
      const textAfter = value.substring(cursorPos);

      // Find the current line
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

      // 4. Table row item: e.g. "| Col 1 | Col 2 |"
      if (currentLine.trim().startsWith('|') && currentLine.trim().endsWith('|')) {
        e.preventDefault();
        const cells = currentLine.trim().split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const isAllEmpty = cells.every((c) => !c.trim());

        // If double enter / empty row, stop table continuation
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

  // Click outside to close mention dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    };
    if (mentionQuery !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mentionQuery]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="rounded-md border border-gray-300 bg-white shadow-xs relative">
      {/* Header Tabs: Write & Preview + Markdown Toolbar */}
      <div className="bg-[#f6f8fa] border-b border-gray-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 rounded-t-md">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'write'
                ? 'bg-white text-gray-900 border border-gray-200 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'preview'
                ? 'bg-white text-gray-900 border border-gray-200 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Toolbar */}
        {activeTab === 'write' && (
          <div className="flex items-center gap-0.5 text-gray-600 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1 hover:bg-gray-200 rounded text-gray-700">
                <Heading className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white text-xs">
                <DropdownMenuItem onClick={() => insertText('# ', '', 'Heading 1')}>
                  Heading 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertText('## ', '', 'Heading 2')}>
                  Heading 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertText('### ', '', 'Heading 3')}>
                  Heading 3
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button type="button" onClick={() => insertText('**', '**', 'bold text')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Bold">
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => insertText('*', '*', 'italic text')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Italic">
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => insertText('> ', '', 'quote text')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Quote">
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => insertText('`', '`', 'code')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Inline Code">
              <Code className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => insertText('[', '](https://example.com)', 'link label')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Link">
              <Link className="h-3.5 w-3.5" />
            </button>

            <span className="w-[1px] h-3.5 bg-gray-300 mx-1" />

            <button type="button" onClick={() => insertText('- ', '', 'List item')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Bullet list">
              <List className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => insertText('1. ', '', 'First item')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Numbered list">
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => insertText('- [ ] ', '', 'Task to complete')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Task list">
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => insertText('\n| Column 1 | Column 2 |\n|---|---|\n| Item 1 | Item 2 |\n', '', '')} className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Table">
              <Table className="h-3.5 w-3.5" />
            </button>

            <span className="w-[1px] h-3.5 bg-gray-300 mx-1" />

            <button
              type="button"
              onClick={() => {
                const textarea = textareaRef.current;
                if (!textarea) return;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue = value.substring(0, start) + '@' + value.substring(end);
                onChange(newValue);
                setMentionQuery('');
                setMentionStartIndex(start);
                setSelectedMentionIdx(0);
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(start + 1, start + 1);
                }, 10);
              }}
              className="p-1 hover:bg-gray-200 rounded text-gray-700"
              title="Mention employee"
            >
              <AtSign className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Textarea or Preview */}
      {activeTab === 'write' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              const pos = e.target.selectionStart;
              onChange(val);
              checkMentionTrigger(val, pos);
            }}
            onClick={() => {
              if (textareaRef.current) {
                checkMentionTrigger(value, textareaRef.current.selectionStart);
              }
            }}
            onKeyUp={(e) => {
              if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && textareaRef.current) {
                checkMentionTrigger(value, textareaRef.current.selectionStart);
              }
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            rows={5}
            className="w-full p-3 text-xs text-gray-900 border-0 focus:ring-0 resize-y font-mono outline-none bg-white rounded-none"
          />

          {/* Light Mode @ Mention Suggestions Dropdown */}
          {mentionQuery !== null && (
            <div
              ref={mentionDropdownRef}
              className="absolute left-3 top-2 z-50 w-80 max-h-56 flex flex-col rounded-lg bg-white text-gray-900 border border-gray-300 shadow-2xl ring-1 ring-black/5 text-xs animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <span>Suggested Members</span>
                <span className="text-[10px] text-gray-400 font-normal">{filteredMentions.length} found</span>
              </div>
              <div className="overflow-y-auto flex-1 py-1 max-h-48">
                {filteredMentions.length === 0 ? (
                  <div className="px-3 py-3 text-center text-gray-400 text-xs italic bg-white">
                    No employees matching "@{mentionQuery}"
                  </div>
                ) : (
                  filteredMentions.map((emp, index) => {
                    const isSelected = index === selectedMentionIdx;
                    return (
                      <div
                        key={emp.id || emp.username}
                        onClick={() => handleSelectMention(emp)}
                        onMouseEnter={() => setSelectedMentionIdx(index)}
                        className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                          isSelected
                            ? 'bg-blue-50 text-[#0B1957] font-semibold'
                            : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            isSelected ? 'bg-[#0B1957] text-white' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {emp.initials}
                          </span>
                          <span className="font-medium text-xs truncate max-w-[130px]">
                            {emp.username}
                          </span>
                        </div>
                        <span className={`text-[11px] truncate max-w-[110px] ml-2 ${
                          isSelected ? 'text-[#0B1957]/80 font-normal' : 'text-gray-500'
                        }`}>
                          {emp.full_name}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Bottom Markdown info */}
          <div className="px-3 py-1.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1 font-medium text-gray-600">
              <span className="font-bold border border-gray-300 rounded px-1 py-0.2 text-[9px] bg-gray-100">M↓</span>
              Markdown is supported
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 min-h-[120px] max-h-72 overflow-y-auto bg-gray-50/30">
          {renderMarkdown(value, handleToggleTaskItem)}
        </div>
      )}

      {/* Submit / Cancel Bar */}
      <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-xs text-gray-700 h-7 px-3"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          className="bg-[#2da44e] hover:bg-[#2c974b] text-white font-semibold text-xs px-3.5 h-7 rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Check className="h-3.5 w-3.5" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Full GitHub Issue Timeline (Description Box + Comments)
// -------------------------------------------------------------
interface GithubIssueTimelineProps {
  description: string;
  descriptionAuthor?: FjtMember;
  descriptionCreatedAt?: string;
  descriptionSaved?: boolean;
  comments?: FjtComment[];
  onSaveDescription: (newDescription: string, author?: FjtMember, createdAt?: string) => void;
  onAddComment?: (comment: FjtComment) => void;
  onUpdateComment?: (commentId: string, newContent: string) => void;
  onDeleteComment?: (commentId: string) => void;
  readOnly?: boolean;
}

export const GithubIssueTimeline: React.FC<GithubIssueTimelineProps> = ({
  description = '',
  descriptionAuthor,
  descriptionCreatedAt,
  descriptionSaved = false,
  comments = [],
  onSaveDescription,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  readOnly = false,
}) => {
  const { data: currentUser } = useCurrentUser();

  // Active user representation from auth context or local storage
  const activeUser: FjtMember = useMemo(() => {
    let localUser: any = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) localUser = JSON.parse(raw);
    } catch {}

    const u = currentUser || localUser;
    const name = u?.full_name || u?.name || u?.email?.split('@')[0] || 'Pagala Chethan Reddy';
    const email = u?.email || 'chethan.p@techiemaya.com';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'PC';

    return {
      id: String(u?.id || u?.user_id || 'usr-chethan'),
      name,
      email,
      initials,
      role: u?.role || 'Author',
    };
  }, [currentUser]);

  // 1. Description Box State
  const [descDraft, setDescDraft] = useState(description);
  const [isEditingDesc, setIsEditingDesc] = useState(!descriptionSaved && !description.trim());
  const [descReactions, setDescReactions] = useState<{ [emoji: string]: number }>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  useEffect(() => {
    setDescDraft(description);
  }, [description]);

  const author = descriptionAuthor || activeUser;
  const createdAt = descriptionCreatedAt || new Date().toISOString();

  const handleCommitDescription = () => {
    if (!descDraft.trim()) {
      toast({
        title: 'Description cannot be empty',
        description: 'Please write some description text before commenting.',
        variant: 'destructive',
      });
      return;
    }

    onSaveDescription(descDraft.trim(), author, createdAt);
    setIsEditingDesc(false);
    toast({
      title: 'Description saved',
      description: 'Your changes have been saved.',
    });
  };

  const handleCancelEditDesc = () => {
    setDescDraft(description);
    if (description.trim()) {
      setIsEditingDesc(false);
    }
  };

  // 2. Comments State
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const handleSaveNewComment = () => {
    if (!newCommentText.trim()) {
      toast({
        title: 'Comment cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    const newComment: FjtComment = {
      id: `comment-${Date.now()}`,
      authorName: activeUser.name,
      authorEmail: activeUser.email,
      authorInitials: activeUser.initials,
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };

    if (onAddComment) {
      onAddComment(newComment);
    }

    setNewCommentText('');
    toast({
      title: 'Comment added',
      description: 'Your comment has been posted.',
    });
  };

  const handleStartEditComment = (c: FjtComment) => {
    setEditingCommentId(c.id);
    setEditingCommentText(c.content);
  };

  const handleSaveEditComment = (commentId: string) => {
    if (!editingCommentText.trim()) return;
    if (onUpdateComment) {
      onUpdateComment(commentId, editingCommentText.trim());
    }
    setEditingCommentId(null);
    toast({ title: 'Comment updated' });
  };

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. TOP BOX: ISSUE DESCRIPTION (GITHUB POST STYLE)             */}
      {/* ============================================================== */}
      <div className="relative pl-8">
        {/* Timeline connector line */}
        <div className="absolute left-3.5 top-3.5 bottom-[-16px] w-[2px] bg-gray-200 z-0" />

        {/* User avatar on the left */}
        <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-[#0B1957] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white z-10 shadow-2xs">
          {author.initials || author.name.slice(0, 2).toUpperCase()}
        </div>

        {isEditingDesc ? (
          /* EDITING MODE: Write & Preview Editor */
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <span>Description</span>
              <span className="text-[10px] text-gray-400 font-normal">• Markdown supported</span>
            </div>
            <MarkdownEditorBox
              value={descDraft}
              onChange={setDescDraft}
              onSubmit={handleCommitDescription}
              onCancel={description.trim() ? handleCancelEditDesc : undefined}
              submitLabel="Comment"
              placeholder="Add your description here..."
              autoFocus
            />
          </div>
        ) : (
          /* SAVED/VIEW MODE: GitHub Issue Description Card */
          <div className="rounded-md border border-gray-300 bg-white overflow-hidden shadow-2xs">
            {/* Header */}
            <div className="bg-[#f6f8fa] px-3.5 py-1.5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-gray-900">{author.name}</span>
                <span className="text-gray-500">
                  commented {formatGithubTimestamp(createdAt)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold border border-gray-300 text-gray-600 px-2 py-0.5 rounded-full bg-white">
                  Author
                </span>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setDescDraft(description);
                      setIsEditingDesc(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-0.5 rounded hover:bg-gray-200/80 transition-colors"
                    title="Edit description"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-3.5 text-xs text-gray-900">
              {renderMarkdown(description, (lIdx) => {
                if (readOnly) return;
                const lines = description.split('\n');
                if (lIdx >= 0 && lIdx < lines.length) {
                  const target = lines[lIdx];
                  if (target.includes('- [ ]')) {
                    lines[lIdx] = target.replace('- [ ]', '- [x]');
                  } else if (target.includes('- [x]')) {
                    lines[lIdx] = target.replace('- [x]', '- [ ]');
                  } else if (target.includes('- [X]')) {
                    lines[lIdx] = target.replace('- [X]', '- [ ]');
                  }
                  onSaveDescription(lines.join('\n'), author, createdAt);
                }
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. SUBSEQUENT COMMENTS TIMELINE (SAVED COMMENTS)              */}
      {/* ============================================================== */}
      {comments.map((comment, index) => {
        const isEditingThisComment = editingCommentId === comment.id;

        return (
          <div key={comment.id} className="relative pl-8">
            {/* Timeline connector line */}
            <div className="absolute left-3.5 top-3.5 bottom-[-16px] w-[2px] bg-gray-200 z-0" />

            {/* User Avatar */}
            <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-[#0B1957] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white z-10 shadow-2xs">
              {comment.authorInitials || comment.authorName.slice(0, 2).toUpperCase()}
            </div>

            {isEditingThisComment ? (
              /* Inline Edit Mode */
              <MarkdownEditorBox
                value={editingCommentText}
                onChange={setEditingCommentText}
                onSubmit={() => handleSaveEditComment(comment.id)}
                onCancel={() => setEditingCommentId(null)}
                submitLabel="Update comment"
                autoFocus
              />
            ) : (
              /* Saved Comment Card */
              <div className="rounded-md border border-gray-300 bg-white overflow-hidden shadow-2xs">
                {/* Header */}
                <div className="bg-[#f6f8fa] px-3.5 py-1.5 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-gray-900">{comment.authorName}</span>
                    <span className="text-gray-500">
                      commented {formatGithubTimestamp(comment.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold border border-gray-300 text-gray-600 px-2 py-0.5 rounded-full bg-white">
                      Collaborator
                    </span>

                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditComment(comment)}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-0.5 rounded hover:bg-gray-200/80 transition-colors"
                          title="Edit comment"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        {onDeleteComment && (
                          <button
                            type="button"
                            onClick={() => onDeleteComment(comment.id)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-3.5 text-xs text-gray-900">
                  {renderMarkdown(comment.content, (lIdx) => {
                    if (readOnly || !onUpdateComment) return;
                    const lines = comment.content.split('\n');
                    if (lIdx >= 0 && lIdx < lines.length) {
                      const target = lines[lIdx];
                      if (target.includes('- [ ]')) {
                        lines[lIdx] = target.replace('- [ ]', '- [x]');
                      } else if (target.includes('- [x]')) {
                        lines[lIdx] = target.replace('- [x]', '- [ ]');
                      } else if (target.includes('- [X]')) {
                        lines[lIdx] = target.replace('- [X]', '- [ ]');
                      }
                      onUpdateComment(comment.id, lines.join('\n'));
                    }
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ============================================================== */}
      {/* 3. "ADD A COMMENT" BOX (GITHUB-STYLE WRITE / PREVIEW)          */}
      {/* ============================================================== */}
      {!readOnly && onAddComment && (
        <div className="relative pl-8 pt-1">
          {/* User Avatar */}
          <div className="absolute left-0 top-2 w-7 h-7 rounded-full bg-[#0B1957] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white z-10 shadow-2xs">
            {activeUser.initials}
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <span>Add a comment</span>
            </div>

            <MarkdownEditorBox
              value={newCommentText}
              onChange={setNewCommentText}
              onSubmit={handleSaveNewComment}
              submitLabel="Comment"
              placeholder="Leave a comment..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
