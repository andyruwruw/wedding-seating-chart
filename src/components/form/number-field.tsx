import "./form.css";

interface NumberFieldProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  disabled?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  id,
  disabled,
}: NumberFieldProps) {
  const input = (
    <input
      id={id}
      className="input"
      type="number"
      value={Number.isFinite(value) ? value : ""}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (Number.isNaN(next)) return;
        onChange(next);
      }}
    />
  );
  if (!label) return input;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      {input}
    </label>
  );
}
