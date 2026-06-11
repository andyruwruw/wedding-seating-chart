import "./form.css";

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: CheckboxProps) {
  return (
    <label className={`check-row ${disabled ? "is-disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="check-text">
        {label}
        {hint && <span className="check-hint">{hint}</span>}
      </span>
    </label>
  );
}
