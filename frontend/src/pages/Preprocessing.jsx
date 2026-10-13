import React, { useState } from "react";
import { PageHeader, Card, Button, KPI, Loader, ErrorBanner, WhatIsThis, Table } from "../components/UI.jsx";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

export default function Preprocessing() {
  const { datasetLoaded, preprocessed, setPreprocessed } = usePipeline();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.preprocess();
      setResult(res);
      setPreprocessed(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!datasetLoaded) {
    return (
      <div>
        <PageHeader title="Data Preprocessing" />
        <Card><p className="text-slate-400 text-sm">Load a dataset first from the Dataset page.</p></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Data Preprocessing"
        subtitle="Duplicate removal, missing-value imputation, date parsing, encoding and scaling — implemented with a reusable sklearn Pipeline + ColumnTransformer."
      />
      <ErrorBanner message={error} />

      <WhatIsThis title="Why a Pipeline + ColumnTransformer?">
        Wrapping every preprocessing step inside a single sklearn Pipeline guarantees that training,
        testing and REST API inference all apply <b>exactly</b> the same transformation logic. This
        prevents "training-serving skew" — a common real-world bug where the live prediction service
        preprocesses data differently from how the model was trained.
      </WhatIsThis>

      <div className="my-6">
        <Button onClick={run} disabled={loading}>{preprocessed ? "Re-run Preprocessing" : "Run Preprocessing"}</Button>
      </div>

      {loading && <Loader text="Cleaning dataset..." />}

      {result && !loading && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Before Preprocessing">
              <div className="grid grid-cols-3 gap-3">
                <KPI label="Rows" value={result.before.rows.toLocaleString()} />
                <KPI label="Missing" value={result.before.missing_values.toLocaleString()} accent="pink" />
                <KPI label="Duplicates" value={result.before.duplicate_records.toLocaleString()} accent="amber" />
              </div>
            </Card>
            <Card title="After Preprocessing">
              <div className="grid grid-cols-3 gap-3">
                <KPI label="Rows" value={result.after.rows.toLocaleString()} accent="accent2" />
                <KPI label="Missing" value={result.after.missing_values.toLocaleString()} accent="accent2" />
                <KPI label="Duplicates" value={result.after.duplicate_records.toLocaleString()} accent="accent2" />
              </div>
            </Card>
          </div>

          <Card title="Detected Column Types">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">Numeric ({result.numeric_columns.length})</div>
                <div className="flex flex-wrap gap-1">
                  {result.numeric_columns.map((c) => (
                    <span key={c} className="badge bg-accent/15 text-accent border border-accent/30">{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Categorical ({result.categorical_columns.length})</div>
                <div className="flex flex-wrap gap-1">
                  {result.categorical_columns.length ? result.categorical_columns.map((c) => (
                    <span key={c} className="badge bg-accent2/15 text-accent2 border border-accent2/30">{c}</span>
                  )) : <span className="text-slate-500 text-xs">none</span>}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Outlier Report (IQR method, reported not removed)">
            <Table
              columns={["Column", "Outliers Detected"]}
              rows={Object.entries(result.after.outliers_by_column).map(([k, v]) => [k, v])}
            />
          </Card>

          <Card>
            <p className="text-sm text-slate-400">{result.note}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

