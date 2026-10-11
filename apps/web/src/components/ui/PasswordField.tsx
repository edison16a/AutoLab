"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { flushSync } from "react-dom";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  label: string;
  /** What the eye button shows, as in "Show password" or "Show PIN". */
  noun?: string;
  /** Extra classes for the input, like mono for a PIN. */
  className?: string;
}

/**
 * A labelled password input with an eye button that shows what was typed.
 * The button sits outside the label, so it never becomes part of the
 * field's name, and a click on it leaves focus and the caret in the input.
 * Its name says what a press does, Show or Hide, so it has no pressed state.
 * Phones never autocorrect the text while it's shown.
 */
export function PasswordField({ label, noun = "password", className = "", disabled, ...rest }: PasswordFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<[number, number] | null>(null);
  const [shown, setShown] = useState(false);
  const action = `${shown ? "Hide" : "Show"} ${noun}`;

  // Submitted as plain text, a password could land in the browser's form
  // history and be missed by the password manager. So submitting hides it.
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const hide = () => flushSync(() => setShown(false));
    form.addEventListener("submit", hide);
    return () => form.removeEventListener("submit", hide);
  }, []);

  // Chrome moves the caret to the start when it next lays out a field whose
  // type changed. Reading its width lays it out now, then the caret goes back.
  useLayoutEffect(() => {
    const field = input.current;
    if (!field || !caret.current) return;
    void field.offsetWidth;
    field.setSelectionRange(...caret.current);
    caret.current = null;
  }, [shown]);

  function toggle() {
    const field = input.current;
    caret.current = field && document.activeElement === field ? [field.selectionStart ?? 0, field.selectionEnd ?? 0] : null;
    setShown((value) => !value);
  }

  const Icon = shown ? EyeOff : Eye;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="password-field">
        <input
          ref={input}
          id={id}
          className={`input ${className}`}
          type={shown ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          {...rest}
        />
        <button
          type="button"
          className="icon-btn icon-btn--sm password-field__toggle"
          aria-label={action}
          title={action}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
        >
          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
