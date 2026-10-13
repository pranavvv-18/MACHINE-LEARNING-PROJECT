import React, { useEffect, useState } from "react";
import { PageHeader, Card, KPI, Table, Loader, ErrorBanner, Button } from "../components/UI.jsx";
import { api } from "../api.js";

export default function Monitoring() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    api.monitoring().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="Model Monitoring"
        subtitle="Simple, educational monitoring of live prediction traffic and basic input drift."
      />
      <ErrorBanner message={error} />

      <div className="mb-4">
        <Button variant="ghost" onClick={load}>Refresh</Button>
      </div>

      {loading && <Loader text="Loading monitoring data..." />}

      {data && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Total Predictions" value={data.num_predictions} />
            <KPI label="Avg Predicted Demand" value={data.avg_prediction ?? "—"} accent="accent2" />
            <KPI label="Min Predicted" value={data.min_prediction ?? "—"} accent="pink" />
            <KPI label="Max Predicted" value={data.max_prediction ?? "—"} accent="amber" />
          </div>

          <Card title="Data Drift Warnings">
            {data.drift_warnings.length ? (
              <ul className="space-y-2">
                {data.drift_warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2">⚠ {w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No significant drift detected in recent prediction inputs.</p>
            )}
          </Card>

          <Card title="Recent Predictions">
            {data.recent_predictions.length ? (
              <Table
                columns={["Timestamp", "Model", "Prediction"]}
                rows={data.recent_predictions.map((p) => [
                  <span className="mono text-xs">{p.timestamp}</span>,
                  p.model,
                  p.prediction,
                ])}
              />
            ) : (
              <p className="text-sm text-slate-500">No predictions logged yet. Generate a prediction on the Prediction page.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

