import "./form.css";

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  id,
  disabled,
  className,
}: SelectProps) {
  const select = (
    <select
      id={id}
      className={`select ${className ?? ""}`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={`${opt.value}-${opt.label}`} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
  if (!label) return select;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      {select}
    </label>
  );
}
