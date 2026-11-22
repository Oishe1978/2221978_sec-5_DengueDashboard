import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
}

export default function ChartCard({ title, subtitle, actions, loading, error, children }: Props) {
  return (
    <section className="chart-card card">
      <header className="chart-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {error ? <p className="alert">{error}</p> : loading ? <p className="muted chart-empty">Loading…</p> : children}
    </section>
  );
}
