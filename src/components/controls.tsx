import type { ReactNode } from "react";
export const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" className="chip" aria-pressed={on} onClick={onClick}>{children}</button>
);
export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return <div className="seg" style={{ flex: 1 }}>{options.map(([k, l]) => <button type="button" key={k} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
