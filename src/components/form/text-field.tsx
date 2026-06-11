import type { InputHTMLAttributes } from "react";
import "./form.css";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function TextField({ label, id, className, ...rest }: TextFieldProps) {
  const input = (
    <input id={id} className={`input ${className ?? ""}`} type="text" {...rest} />
  );
  if (!label) return input;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      {input}
    </label>
  );
}
