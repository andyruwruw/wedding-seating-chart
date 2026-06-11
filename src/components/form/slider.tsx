import "./form.css";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Optional formatter for the value readout. */
  display?: (value: number) => string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: SliderProps) {
  return (
    <label className="field">
      <span className="slider-label">
        <span className="field-label">{label}</span>
        <span className="slider-value">{display ? display(value) : value}</span>
      </span>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
