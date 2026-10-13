import React, { useEffect, useState } from "react";
import { PageHeader, Card, KPI, Loader, ErrorBanner, WhatIsThis } from "../components/UI.jsx";
import { ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

const METRIC_EXPLANATIONS = {
  mae: "Average absolute difference between actual and predicted demand.",
  mse: "Average squared prediction error (penalizes larger errors more).",
  rmse: "Square root of MSE, expressed in the same units as demand.",
  r2: "Proportion of variation in demand explained by the model (closer to 1 is better).",
};

export default function Evaluation() {
  const { trained } = usePipeline();
  const [data, setData] = useState(null);
  const [model, setModel] = useState("ridge");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trained) return;
    setLoading(true);
    api.evaluation().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [trained]);

  if (!trained) {
    return (
      <div>
        <PageHeader title="Model Evaluation" />
        <Card><p className="text-slate-400 text-sm">Train models first.</p></Card>
      </div>
    );
  }

  if (loading) return <Loader text="Loading evaluation..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const m = data[model];
  const avpData = m.actual_vs_predicted.actual.map((a, i) => ({ actual: a, predicted: m.actual_vs_predicted.predicted[i] }));
  const residualData = m.residuals.map((r, i) => ({ index: i, residual: r }));

  return (
    <div>
      <PageHeader title="Model Evaluation" subtitle="Regression metrics only — this is a regression project, not classification." />
      <ErrorBanner message={error} />

      <div className="flex gap-2 mb-6">
        {["ridge", "lasso"].map((n) => (
          <button key={n} onClick={() => setModel(n)} className={`px-4 py-1.5 rounded-lg text-sm border ${model === n ? "bg-accent/20 border-accent/40 text-white" : "border-white/10 text-slate-400"}`}>
            {n === "ridge" ? "Ridge Regression" : "Lasso Regression"}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {Object.entries(METRIC_EXPLANATIONS).map(([k, desc]) => (
          <WhatIsThis key={k} title={k.toUpperCase()}>{desc}</WhatIsThis>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Train RMSE" value={m.train_metrics.rmse.toFixed(3)} />
        <KPI label="Test RMSE" value={m.test_metrics.rmse.toFixed(3)} accent="accent2" />
        <KPI label="CV RMSE" value={m.cv_mean_rmse.toFixed(3)} accent="pink" />
        <KPI label="Test R²" value={m.test_metrics.r2.toFixed(4)} accent="amber" />
        <KPI label="Train MAE" value={m.train_metrics.mae.toFixed(3)} />
        <KPI label="Test MAE" value={m.test_metrics.mae.toFixed(3)} accent="accent2" />
        <KPI label="Train MSE" value={m.train_metrics.mse.toFixed(3)} />
        <KPI label="Test MSE" value={m.test_metrics.mse.toFixed(3)} accent="accent2" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Actual vs Predicted Demand">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" dataKey="actual" name="Actual" stroke="#8892b0" fontSize={11} />
                <YAxis type="number" dataKey="predicted" name="Predicted" stroke="#8892b0" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={avpData} fill="#7c9dff" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Residual Plot">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" dataKey="index" name="Test Sample" stroke="#8892b0" fontSize={11} />
                <YAxis type="number" dataKey="residual" name="Residual" stroke="#8892b0" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                <ReferenceLine y={0} stroke="#7ce0c9" strokeDasharray="4 4" />
                <Scatter data={residualData} fill="#f0a6e8" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

