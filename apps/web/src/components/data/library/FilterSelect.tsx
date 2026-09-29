interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}

/**
 * A native select with its name printed inside the box ("Status  All"), so
 * short option names still make sense without a label row above the toolbar.
 */
export function FilterSelect<T extends string>({ label, value, options, onChange }: FilterSelectProps<T>) {
  return (
    <label className="data-select">
      <span className="data-select__label">{label}</span>
      <select className="data-select__control" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
