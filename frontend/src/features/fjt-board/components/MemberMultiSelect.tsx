import React, { useState, useRef, useEffect } from 'react';
import { FjtMember } from '@/sdk/features/fjt-board';
import { Check, ChevronDown, Plus, User, X, Search } from 'lucide-react';

interface MemberMultiSelectProps {
  label: string;
  placeholder?: string;
  selectedMembers: FjtMember[];
  availableMembers: FjtMember[];
  onChange: (members: FjtMember[]) => void;
  badgeColor?: string; // default dark blue
  className?: string;
  readOnly?: boolean;
  direction?: 'up' | 'down';
}

export const MemberMultiSelect: React.FC<MemberMultiSelectProps> = ({
  label,
  placeholder = 'Select members...',
  selectedMembers = [],
  availableMembers = [],
  onChange,
  badgeColor = '#0B1957',
  className = '',
  readOnly = false,
  direction = 'up',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedIds = new Set(selectedMembers.map((m) => m.id || m.name));

  const filteredMembers = availableMembers.filter((m) => {
    const query = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      (m.email && m.email.toLowerCase().includes(query))
    );
  });

  const toggleMember = (member: FjtMember) => {
    const memberId = member.id || member.name;
    if (selectedIds.has(memberId)) {
      onChange(selectedMembers.filter((m) => (m.id || m.name) !== memberId));
    } else {
      onChange([...selectedMembers, member]);
    }
  };

  const removeMember = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedMembers.filter((m) => (m.id || m.name) !== memberId));
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {selectedMembers.length > 0 && (
          <span className="text-[11px] text-gray-500 font-normal">
            {selectedMembers.length} selected
          </span>
        )}
      </label>

      {/* Trigger Area / Chips Container */}
      <div
        onClick={() => !readOnly && setIsOpen((prev) => !prev)}
        className={`min-h-[38px] max-h-36 overflow-y-auto p-1.5 bg-white border border-gray-300 rounded-md flex flex-wrap items-center gap-1.5 cursor-pointer transition-all ${
          isOpen ? 'ring-2 ring-[#0B1957]/30 border-[#0B1957]' : 'hover:border-gray-400'
        } ${readOnly ? 'cursor-default opacity-90' : ''}`}
      >
        {selectedMembers.length === 0 ? (
          <span className="text-xs text-gray-400 px-1.5 flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-gray-400" />
            {placeholder}
          </span>
        ) : (
          selectedMembers.map((member) => {
            const memberId = member.id || member.name;
            return (
              <span
                key={memberId}
                className="inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-800 shadow-2xs group"
              >
                <span
                  className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: badgeColor }}
                >
                  {member.initials || member.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="font-medium text-gray-800 text-[11px] max-w-[110px] truncate">
                  {member.name}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => removeMember(memberId, e)}
                    className="text-gray-400 hover:text-red-600 rounded-full p-0.5 transition-colors"
                    title={`Remove ${member.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })
        )}

        {!readOnly && (
          <div className="ml-auto pl-1 pr-1 text-gray-400">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>

      {/* Dropdown Menu with Search and Member Checkboxes (Opens UPWARDS by default) */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 ${
            direction === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } bg-white border border-gray-200 rounded-md shadow-2xl z-50 max-h-64 flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95`}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-transparent border-none focus:outline-none placeholder-gray-400 text-gray-800"
              autoFocus
            />
          </div>

          {/* Members List */}
          <div className="overflow-y-auto max-h-52 divide-y divide-gray-50 p-1">
            {filteredMembers.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">
                No matching members found
              </div>
            ) : (
              filteredMembers.map((member) => {
                const memberId = member.id || member.name;
                const isSelected = selectedIds.has(memberId);
                return (
                  <div
                    key={memberId}
                    onClick={() => toggleMember(member)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 text-blue-900 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: badgeColor }}
                      >
                        {member.initials || member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col text-left min-w-0">
                        <span className="truncate leading-tight font-medium">
                          {member.name}
                        </span>
                        {member.email && (
                          <span className="text-[10px] text-gray-400 truncate leading-tight">
                            {member.email} {member.role === 'admin' ? '• Admin' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#0B1957] border-[#0B1957] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Selection Footer */}
          <div className="p-1.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => onChange(availableMembers)}
              className="text-[#0B1957] hover:underline font-medium px-2 py-0.5"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-gray-500 hover:text-red-600 font-medium px-2 py-0.5"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
