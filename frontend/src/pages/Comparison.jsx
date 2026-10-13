import React, { useEffect, useState } from "react";
import { PageHeader, Card, Table, Loader, ErrorBanner } from "../components/UI.jsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

export default function Comparison() {
  const { trained } = usePipeline();
  const [data, setData] = useState(null);
  const [coefData, setCoefData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trained) return;
    setLoading(true);
    Promise.all([api.comparison(), api.coefficients()])
      .then(([c, coef]) => { setData(c); setCoefData(coef); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [trained]);

  if (!trained) {
    return (
      <div>
        <PageHeader title="Ridge vs Lasso" />
        <Card><p className="text-slate-400 text-sm">Train both models on the Model Training page first.</p></Card>
      </div>
    );
  }

  if (loading) return <Loader text="Loading comparison..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const metricChart = ["mae", "mse", "rmse", "r2"].map((m) => ({
    metric: m.toUpperCase(),
    Ridge: data.ridge.test[m],
    Lasso: data.lasso.test[m],
  }));

  const coefChart = (coefData?.rows || []).slice(0, 15).map((r) => ({
    feature: r.feature.replace("num__", "").replace("cat__", ""),
    Ridge: r.ridge_coefficient,
    Lasso: r.lasso_coefficient,
  }));

  return (
    <div>
      <PageHeader
        title="Ridge vs Lasso — Comparison"
        subtitle="Actual measured metrics are shown side by side — interpret the trade-offs yourself rather than relying on an arbitrary winner score."
      />

      <Card className="mb-6" title="Comparison Table">
        <Table
          columns={["Metric", "Ridge Regression", "Lasso Regression"]}
          rows={[
            ["Best Alpha", data.ridge.best_alpha, data.lasso.best_alpha],
            ["CV RMSE", data.ridge.cv_rmse.toFixed(3), data.lasso.cv_rmse.toFixed(3)],
            ["Train MAE", data.ridge.train.mae.toFixed(3), data.lasso.train.mae.toFixed(3)],
            ["Train RMSE", data.ridge.train.rmse.toFixed(3), data.lasso.train.rmse.toFixed(3)],
            ["Train R²", data.ridge.train.r2.toFixed(4), data.lasso.train.r2.toFixed(4)],
            ["Test MAE", data.ridge.test.mae.toFixed(3), data.lasso.test.mae.toFixed(3)],
            ["Test MSE", data.ridge.test.mse.toFixed(3), data.lasso.test.mse.toFixed(3)],
            ["Test RMSE", data.ridge.test.rmse.toFixed(3), data.lasso.test.rmse.toFixed(3)],
            ["Test R²", data.ridge.test.r2.toFixed(4), data.lasso.test.r2.toFixed(4)],
            ["Non-zero Coefficients", `${data.ridge.non_zero_coefficients} / ${data.ridge.total_coefficients}`, `${data.lasso.non_zero_coefficients} / ${data.lasso.total_coefficients}`],
          ]}
        />
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card title="Test Metric Comparison">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricChart}>
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
        </Card>

        <Card title="Coefficient Comparison (top 15)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coefChart} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="#8892b0" fontSize={10} />
                <YAxis type="category" dataKey="feature" stroke="#8892b0" fontSize={10} width={90} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Legend />
                <Bar dataKey="Ridge" fill="#7c9dff" />
                <Bar dataKey="Lasso" fill="#7ce0c9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-sm text-slate-400">
          Lasso zeroed out <b className="text-accent2">{coefData?.lasso_zeroed_features?.length || 0}</b> feature(s):{" "}
          {coefData?.lasso_zeroed_features?.length
            ? coefData.lasso_zeroed_features.map((f) => f.replace("num__", "").replace("cat__", "")).join(", ")
            : "none at the selected alpha."}
        </p>
      </Card>
    </div>
  );
}

