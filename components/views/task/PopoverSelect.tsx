import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function PopoverSelect({
  value,
  options,
  onChange,
}: any) {
  const [open, setOpen] = useState(false);

  return (
    <div className="popover">
      <div
        className="popover-trigger"
        onClick={() => setOpen(!open)}
      >
        {value}
        <ChevronDown size={14} />
      </div>

      {open && (
        <div className="popover-menu">
          {options.map((o: string) => (
            <div
              key={o}
              className="popover-item"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
