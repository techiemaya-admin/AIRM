export default function DatePickerField({
    label,
    value,
    onChange,
  }: any) {
    return (
      <div>
        <span className="meta-label">{label}</span>
        <input
          type="date"
          className="meta-value"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  