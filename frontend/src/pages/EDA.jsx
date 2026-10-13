import React, { useEffect, useState } from "react";
import { PageHeader, Card, Loader, ErrorBanner } from "../components/UI.jsx";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

function Heatmap({ columns, matrix }) {
  const color = (v) => {
    const t = (v + 1) / 2; // -1..1 -> 0..1
    const r = Math.round(240 - t * 150);
    const g = Math.round(100 + t * 120);
    const b = Math.round(200 - t * 60);
    return `rgb(${r},${g},${b})`;
  };
  return (
    <div className="scroll-x">
      <table className="text-[10px] border-collapse">
        <thead>
          <tr>
            <th></th>
            {columns.map((c) => <th key={c} className="px-2 py-1 text-slate-400 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="px-2 py-1 text-slate-400 whitespace-nowrap">{columns[i]}</td>
              {row.map((v, j) => (
                <td key={j} style={{ background: color(v) }} className="w-10 h-8 text-center text-[#0a0e1a] font-semibold">
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EDA() {
  const { preprocessed } = usePipeline();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!preprocessed) return;
    setLoading(true);
    api.eda().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [preprocessed]);

  if (!preprocessed) {
    return (
      <div>
        <PageHeader title="Exploratory Data Analysis" />
        <Card><p className="text-slate-400 text-sm">Run preprocessing first.</p></Card>
      </div>
    );
  }

  if (loading) return <Loader text="Building EDA dashboard..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const histData = data.demand_histogram
    ? data.demand_histogram.counts.map((c, i) => ({
        bin: `${data.demand_histogram.bin_edges[i].toFixed(0)}`,
        count: c,
      }))
    : [];

  const timeData = data.demand_over_time
    ? data.demand_over_time.dates.map((d, i) => ({ date: d, demand: data.demand_over_time.values[i] }))
    : [];

  return (
    <div>
      <PageHeader title="Exploratory Data Analysis" subtitle="Charts update automatically based on the uploaded / loaded dataset." />

      <div className="grid md:grid-cols-2 gap-6">
        {histData.length > 0 && (
          <Card title="Demand Distribution">
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={histData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="bin" stroke="#8892b0" fontSize={10} />
                <YAxis stroke="#8892b0" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="count" fill="#7c9dff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
        )}

        {timeData.length > 0 && (
          <Card title="Demand Over Time (last 365 days)">
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#8892b0" fontSize={9} tick={false} />
                <YAxis stroke="#8892b0" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Line type="monotone" dataKey="demand" stroke="#7ce0c9" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer></div>
          </Card>
        )}

        {data.item_wise_demand && (
          <Card title="Product-wise Demand">
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.item_wise_demand.labels.map((l, i) => ({ label: l, value: data.item_wise_demand.values[i] }))}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#8892b0" fontSize={10} />
                <YAxis stroke="#8892b0" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="value" fill="#f0a6e8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
        )}

        {data.store_wise_demand && (
          <Card title="Store-wise Demand">
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.store_wise_demand.labels.map((l, i) => ({ label: l, value: data.store_wise_demand.values[i] }))}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#8892b0" fontSize={10} />
                <YAxis stroke="#8892b0" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="value" fill="#7c9dff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
        )}

        {data.scatter && (
          <Card title={`Scatter: ${data.scatter.x_label} vs Demand`}>
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" dataKey="x" name={data.scatter.x_label} stroke="#8892b0" fontSize={10} />
                <YAxis type="number" dataKey="y" name="demand" stroke="#8892b0" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Scatter data={data.scatter.x.map((x, i) => ({ x, y: data.scatter.y[i] }))} fill="#7ce0c9" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer></div>
          </Card>
        )}

        {data.countplot && (
          <Card title={`Count Plot: ${data.countplot.column}`}>
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.countplot.labels.map((l, i) => ({ label: l, value: data.countplot.values[i] }))}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#8892b0" fontSize={10} />
                <YAxis stroke="#8892b0" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="value" fill="#f0a6e8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
        )}
      </div>

      {data.correlation_heatmap && (
        <Card className="mt-6" title="Correlation Heatmap">
          <Heatmap columns={data.correlation_heatmap.columns} matrix={data.correlation_heatmap.matrix} />
        </Card>
      )}

      {data.boxplot && (
        <Card className="mt-6" title="Box Plot Summary (numeric columns)">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {Object.entries(data.boxplot).map(([col, values]) => {
              const sorted = [...values].sort((a, b) => a - b);
              const q1 = sorted[Math.floor(sorted.length * 0.25)];
              const med = sorted[Math.floor(sorted.length * 0.5)];
              const q3 = sorted[Math.floor(sorted.length * 0.75)];
              return (
                <div key={col} className="glass p-3">
                  <div className="text-accent2 mono text-xs mb-1">{col}</div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Q1: {q1?.toFixed(1)}</span><span>Med: {med?.toFixed(1)}</span><span>Q3: {q3?.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

