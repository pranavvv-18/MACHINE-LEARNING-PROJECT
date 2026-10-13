import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Card, KPI, StatusPill, Loader } from "../components/UI.jsx";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

const STEPS = [
  { key: "datasetLoaded", label: "Dataset" },
  { key: "preprocessed", label: "Preprocessing" },
  { key: "featuresEngineered", label: "Feature Engineering" },
  { key: "splitDone", label: "Train/Test Split" },
  { key: "trained", label: "Model Training" },
];

export default function Dashboard() {
  const pipeline = usePipeline();
  const { datasetLoaded, datasetInfo, splitInfo, trained } = pipeline;
  const [comparison, setComparison] = useState(null);
  const [eda, setEda] = useState(null);
  const [monitoring, setMonitoring] = useState(null);

  useEffect(() => {
    if (trained) {
      api.comparison().then(setComparison).catch(() => {});
      api.monitoring().then(setMonitoring).catch(() => {});
    }
  }, [trained]);

  useEffect(() => {
    if (pipeline.preprocessed) {
      api.eda().then(setEda).catch(() => {});
    }
  }, [pipeline.preprocessed]);

  return (
    <div>
      <PageHeader
        title="Product Demand Forecasting Using Ridge and Lasso Regression"
        subtitle="An end-to-end academic ML web application demonstrating the complete lifecycle from raw data to a monitored REST prediction service."
        badge="Live ML Dashboard"
      />

      <Card className="mb-6" title="Pipeline Progress">
        <div className="flex flex-wrap gap-3">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <StatusPill ok={pipeline[s.key]} okText={s.label} noText={s.label} />
              {i < STEPS.length - 1 && <span className="text-slate-600">→</span>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <KPI label="Dataset Rows" value={datasetInfo ? datasetInfo.rows.toLocaleString() : "—"} />
        <KPI label="Features" value={datasetInfo ? datasetInfo.feature_columns.length : "—"} accent="accent2" />
        <KPI label="Training Records" value={splitInfo ? splitInfo.training_records.toLocaleString() : "—"} />
        <KPI label="Testing Records" value={splitInfo ? splitInfo.testing_records.toLocaleString() : "—"} accent="pink" />
        <KPI label="Best Ridge Alpha" value={comparison ? comparison.ridge.best_alpha : "—"} accent="amber" />
        <KPI label="Best Lasso Alpha" value={comparison ? comparison.lasso.best_alpha : "—"} accent="amber" />
        <KPI label="Ridge Test RMSE" value={comparison ? comparison.ridge.test.rmse.toFixed(2) : "—"} />
        <KPI label="Lasso Test RMSE" value={comparison ? comparison.lasso.test.rmse.toFixed(2) : "—"} accent="accent2" />
        <KPI label="Ridge Test R²" value={comparison ? comparison.ridge.test.r2.toFixed(3) : "—"} />
        <KPI label="Lasso Test R²" value={comparison ? comparison.lasso.test.r2.toFixed(3) : "—"} accent="accent2" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card title="Demand Trend">
          {eda?.demand_over_time ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eda.demand_over_time.dates.map((d, i) => ({ date: d, demand: eda.demand_over_time.values[i] }))}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#8892b0" fontSize={9} tick={false} />
                  <YAxis stroke="#8892b0" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Line type="monotone" dataKey="demand" stroke="#7c9dff" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-10 text-center">Run Preprocessing to view demand trend.</p>
          )}
        </Card>

        <Card title="Ridge vs Lasso — Test RMSE / R²">
          {comparison ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { metric: "RMSE", Ridge: comparison.ridge.test.rmse, Lasso: comparison.lasso.test.rmse },
                    { metric: "MAE", Ridge: comparison.ridge.test.mae, Lasso: comparison.lasso.test.mae },
                  ]}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="metric" stroke="#8892b0" fontSize={11} />
                  <YAxis stroke="#8892b0" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Legend />
                  <Bar dataKey="Ridge" fill="#7c9dff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lasso" fill="#7ce0c9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-10 text-center">Train models to view comparison.</p>
          )}
        </Card>
      </div>

      <Card title="Recent Predictions">
        {monitoring?.recent_predictions?.length ? (
          <div className="space-y-2">
            {monitoring.recent_predictions.slice(0, 5).map((p, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-white/5 py-2">
                <span className="text-slate-400">{p.model}</span>
                <span className="mono text-accent">{p.prediction} units</span>
                <span className="text-xs text-slate-500 mono">{p.timestamp}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No predictions yet. Visit the <Link to="/prediction" className="text-accent underline">Prediction</Link> page after training.
          </p>
        )}
      </Card>

      {!datasetLoaded && (
        <Card className="mt-6 border border-accent/30">
          <p className="text-sm text-slate-300">
            👋 Start by visiting the <Link to="/dataset" className="text-accent underline font-semibold">Dataset</Link> page to load the sample dataset or upload your own CSV.
          </p>
        </Card>
      )}
    </div>
  );
}

