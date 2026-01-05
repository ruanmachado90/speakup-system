export const Form = ({label, name, type="text", defaultValue, required, step, placeholder}) => (
  <div>
    <label className="block text-sm font-semibold mb-2">{label} {required && <span className="text-rose-500">*</span>}</label>
    <input
      type={type}
      name={name}
      defaultValue={defaultValue}
      required={required}
      step={step}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
    />
  </div>
);
