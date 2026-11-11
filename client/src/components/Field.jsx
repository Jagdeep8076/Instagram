import { useId, useState } from 'react';
import Icon from './Icon';

// Floating-label input (like Instagram's new auth forms). type="password" gets a show/hide eye.
export function Field({ label, type = 'text', value, onChange, error, hint, right, ...rest }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className="field-wrap">
      <div className={'field' + (error ? ' err' : '')}>
        <input id={id} type={isPw && show ? 'text' : type} value={value} onChange={onChange} placeholder=" " {...rest} />
        <label htmlFor={id}>{label}</label>
        {isPw && <button type="button" className="eye" tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}><Icon name={show ? 'eye-off-line' : 'eye-line'} /></button>}
        {right}
      </div>
      {error ? <p className="field-msg bad"><Icon name="error-warning-line" /> {error}</p> : hint}
    </div>
  );
}

export function Select({ label, value, onChange, options, error }) {
  return (
    <div className={'select' + (error ? ' err' : '') + (value ? ' filled' : '')}>
      <select value={value} onChange={onChange} aria-label={label}>
        <option value="" disabled hidden>{label}</option>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      <Icon name="arrow-down-s-line" />
    </div>
  );
}
