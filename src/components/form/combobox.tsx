import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./form.css";

export interface ComboboxOption {
  label: string;
  value: string;
}

interface ComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
}

/** A select that lets you type to search the options, then click/Enter to pick. */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = "Search…",
  emptyText = "No matches",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    if (!open || query.trim() === "") return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [open, query, options]);

  const measure = () => {
    if (controlRef.current) {
      const r = controlRef.current.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  };

  // Keep the floating list glued to the input while open (panel can scroll).
  useEffect(() => {
    if (!open) return;
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  // Close when clicking outside both the control and the floating list.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        controlRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const openList = () => {
    measure();
    setOpen(true);
    setHighlight(0);
  };

  const choose = (opt: ComboboxOption) => {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList();
      else setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        choose(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="field combobox">
      {label && <span className="field-label">{label}</span>}
      <div className="combobox-control" ref={controlRef}>
        <input
          className="input"
          value={open ? query : selectedLabel}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={openList}
          onKeyDown={onKeyDown}
        />
      </div>

      {open &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            className="combobox-list"
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              width: rect.width,
            }}
          >
            {filtered.length === 0 && (
              <li className="combobox-empty">{emptyText}</li>
            )}
            {filtered.map((o, i) => (
              <li
                key={o.value}
                className={`combobox-option ${i === highlight ? "is-active" : ""} ${
                  o.value === value ? "is-selected" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
