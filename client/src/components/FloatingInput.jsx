import { useState } from 'react';

export default function FloatingInput({
  id,
  label,
  type = 'text',
  value = '',
  onChange,
  required = false,
  error = '',
  endAdornment = null,
  disabled = false,
  autoComplete,
  maxLength,
  hint = '',
}) {
  const [focused, setFocused] = useState(false);
  const inputId = id || 'input-' + label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const isFilled = value !== '' && value !== undefined && value !== null;
  const isFloating = focused || isFilled;

  return (
    <div className={`floating-group ${isFloating ? 'floating' : ''} ${focused ? 'focused' : ''} ${error ? 'has-error' : ''}`}>
      <div className="floating-input-wrapper">
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          placeholder=" "
          aria-invalid={Boolean(error)}
        />
        <label htmlFor={inputId}>{label}</label>
        {endAdornment && <div className="floating-adornment">{endAdornment}</div>}
      </div>
      {hint && !error && <small className="floating-hint muted">{hint}</small>}
      {error && <small className="floating-error error">{error}</small>}
    </div>
  );
}

