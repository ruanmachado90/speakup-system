export const Card = ({children, className = ''}) => (
  <div className={`bg-white p-6 rounded-2xl border flex flex-col ${className}`}>{children}</div>
);
