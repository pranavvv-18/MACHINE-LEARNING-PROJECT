import React, { useState } from "react";
import { PageHeader, Card, Button, Loader, ErrorBanner, WhatIsThis, Table } from "../components/UI.jsx";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

export default function FeatureEngineering() {
  const { preprocessed, featuresEngineered, setFeaturesEngineered, setFeatureColumns } = usePipeline();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.featureEngineering();
      setResult(res);
      setFeaturesEngineered(true);
      setFeatureColumns(res.model_feature_columns);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!preprocessed) {
    return (
      <div>
        <PageHeader title="Feature Engineering" />
        <Card><p className="text-slate-400 text-sm">Run preprocessing first from the Preprocessing page.</p></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Feature Engineering"
        subtitle="Create calendar features from the date column and leakage-safe historical demand (lag / rolling) features."
      />
      <ErrorBanner message={error} />

      <WhatIsThis title="Avoiding Target Leakage">
        Lag and rolling features are computed using <code className="mono">shift(1)</code> before any
        rolling aggregation, so each row only sees demand values from strictly earlier time periods.
        No feature is allowed to see the value it is trying to predict, or any future information.
      </WhatIsThis>

      <div className="my-6">
        <Button onClick={run} disabled={loading}>{featuresEngineered ? "Re-run Feature Engineering" : "Generate Features"}</Button>
      </div>

      {loading && <Loader text="Engineering features..." />}

      {result && !loading && (
        <div className="space-y-6">
          <Card title={`Feature Table (${result.feature_table.length} entries)`}>
            <Table
              columns={["Feature Name", "Type", "Description", "Status", "Reason"]}
              rows={result.feature_table.map((f) => [
                <span className="mono">{f.name}</span>,
                f.type,
                f.description,
                <span className={`badge ${f.status === "USED" ? "bg-accent2/15 text-accent2 border border-accent2/30" : "bg-red-500/15 text-red-300 border border-red-400/30"}`}>{f.status}</span>,
                f.reason,
              ])}
            />
          </Card>

          <Card title="Final Model Feature Columns">
            <div className="flex flex-wrap gap-2">
              {result.model_feature_columns.map((c) => (
                <span key={c} className="badge bg-accent/15 text-accent border border-accent/30 mono">{c}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">Rows remaining after feature engineering: {result.rows_after_feature_engineering.toLocaleString()}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

