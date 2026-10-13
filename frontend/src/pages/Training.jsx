import React, { useState } from "react";
import { PageHeader, Card, Button, KPI, Loader, ErrorBanner, WhatIsThis, Table } from "../components/UI.jsx";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

export default function Training() {
  const { splitDone, trainResults, setTrainResults, setTrained } = usePipeline();
  const [cvFolds, setCvFolds] = useState(5);
  const [useTimeseries, setUseTimeseries] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.train(cvFolds, useTimeseries);
      setTrainResults(res);
      setTrained(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!splitDone) {
    return (
      <div>
        <PageHeader title="Model Training" />
        <Card><p className="text-slate-400 text-sm">Complete the Train/Test Split step first.</p></Card>
      </div>
    );
  }

  const alphaChartData = (name) => {
    if (!trainResults) return [];
    return trainResults[name].all_alpha_scores.map((a) => ({ alpha: String(a.alpha), rmse: a.mean_rmse }));
  };

  return (
    <div>
      <PageHeader
        title="Model Training"
        subtitle="Ridge and Lasso Regression trained with GridSearchCV, searching alpha over cross-validated folds of the training data."
      />
      <ErrorBanner message={error} />

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <WhatIsThis title="What is Ridge Regression?">
          Ridge Regression is linear regression with L2 regularization. It shrinks large coefficients
          toward zero (without eliminating them), reducing model variance and helping to prevent overfitting.
        </WhatIsThis>
        <WhatIsThis title="What is Lasso Regression?">
          Lasso Regression uses L1 regularization, which can shrink some feature coefficients exactly
          to zero — effectively performing automatic feature selection.
        </WhatIsThis>
      </div>

      <WhatIsThis title="What is Cross-Validation?">
        Cross-validation repeatedly splits the training data into training/validation folds to estimate
        how well a given alpha (regularization strength) generalizes, before ever touching the held-out
        test set. Here we use {useTimeseries ? "TimeSeriesSplit (folds respect chronological order)" : "K-Fold"} with GridSearchCV to try alpha ∈ {"{0.01, 0.1, 1, 10, 100}"}.
      </WhatIsThis>

      <Card className="my-6" title="Training Configuration">
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1">CV Folds</label>
            <select value={cvFolds} onChange={(e) => setCvFolds(Number(e.target.value))} className="bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white">
              {[3, 4, 5, 6].map((v) => <option key={v} value={v} className="bg-[#0e1424]">{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">CV Strategy</label>
            <select value={useTimeseries ? "ts" : "kf"} onChange={(e) => setUseTimeseries(e.target.value === "ts")} className="bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white">
              <option value="ts" className="bg-[#0e1424]">TimeSeriesSplit</option>
              <option value="kf" className="bg-[#0e1424]">K-Fold</option>
            </select>
          </div>
          <Button onClick={run} disabled={loading}>Train Ridge &amp; Lasso</Button>
        </div>
      </Card>

      {loading && <Loader text="Running GridSearchCV for Ridge and Lasso..." />}

      {trainResults && !loading && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {["ridge", "lasso"].map((name) => (
              <Card key={name} title={`${name === "ridge" ? "Ridge Regression" : "Lasso Regression"} — CV Results`}>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <KPI label="Best Alpha" value={trainResults[name].best_alpha} accent={name === "ridge" ? "accent" : "accent2"} />
                  <KPI label="CV Mean RMSE" value={trainResults[name].cv_mean_rmse.toFixed(3)} />
                  <KPI label="CV Std RMSE" value={trainResults[name].cv_std_rmse.toFixed(3)} />
                  <KPI label="Folds" value={trainResults[name].cv_folds} />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={alphaChartData(name)}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="alpha" stroke="#8892b0" fontSize={11} />
                      <YAxis stroke="#8892b0" fontSize={11} />
                      <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                      <Line type="monotone" dataKey="rmse" stroke={name === "ridge" ? "#7c9dff" : "#7ce0c9"} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Mean CV RMSE across tested alpha values (lower is better)</p>
              </Card>
            ))}
          </div>

          <Card title="Final Trained Models">
            <Table
              columns={["Model", "Default Alpha", "Tested Alphas", "Best Alpha", "CV Score (RMSE)"]}
              rows={["ridge", "lasso"].map((name) => [
                name === "ridge" ? "Ridge Regression" : "Lasso Regression",
                "1.0",
                trainResults[name].tested_alphas.join(", "),
                trainResults[name].best_alpha,
                trainResults[name].cv_mean_rmse.toFixed(3),
              ])}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

