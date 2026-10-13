import React, { useEffect, useState } from "react";
import { PageHeader, Card, KPI, Table, Loader, ErrorBanner, Button } from "../components/UI.jsx";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

export default function DataUnderstanding() {
  const { datasetLoaded } = usePipeline();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);
  const [colDetail, setColDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dataUnderstanding();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (datasetLoaded) load();
  }, [datasetLoaded]);

  const inspectColumn = async (col) => {
    setSelectedCol(col);
    try {
      const detail = await api.columnDetail(col);
      setColDetail(detail);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!datasetLoaded) {
    return (
      <div>
        <PageHeader title="Data Understanding" />
        <Card><p className="text-slate-400 text-sm">Load a dataset first from the Dataset page.</p></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Data Understanding"
        subtitle="Inspect the dataset's shape, data types, missing values, duplicates and per-column statistics."
      />
      <ErrorBanner message={error} />
      {loading && <Loader text="Analyzing dataset..." />}

      {data && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPI label="Total Records" value={data.total_records.toLocaleString()} />
            <KPI label="Total Features" value={data.total_features} accent="accent2" />
            <KPI label="Missing Values" value={data.missing_values_total.toLocaleString()} accent="pink" />
            <KPI label="Duplicate Records" value={data.duplicate_records.toLocaleString()} accent="amber" />
            <KPI label="Columns Inspected" value={Object.keys(data.columns).length} />
          </div>

          <Card title="Statistical Summary (numeric columns)">
            <Table
              columns={["Column", "Min", "Max", "Mean", "Median", "Std Dev", "Missing", "Unique"]}
              rows={Object.entries(data.columns)
                .filter(([, v]) => "mean" in v)
                .map(([col, v]) => [
                  col,
                  v.min?.toFixed(2), v.max?.toFixed(2), v.mean?.toFixed(2), v.median?.toFixed(2), v.std?.toFixed(2),
                  v.missing, v.unique,
                ])}
            />
          </Card>

          <Card title="Inspect a Column">
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(data.columns).map((c) => (
                <button
                  key={c}
                  onClick={() => inspectColumn(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    selectedCol === c ? "bg-accent/20 border-accent/40 text-white" : "border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {colDetail && (
              <div className="glass p-4">
                <div className="mono text-sm text-accent2 mb-2">{colDetail.name} — {colDetail.dtype}</div>
                {"mean" in colDetail ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                    <div><div className="text-slate-500 text-xs">Min</div>{colDetail.min?.toFixed(2)}</div>
                    <div><div className="text-slate-500 text-xs">Max</div>{colDetail.max?.toFixed(2)}</div>
                    <div><div className="text-slate-500 text-xs">Mean</div>{colDetail.mean?.toFixed(2)}</div>
                    <div><div className="text-slate-500 text-xs">Median</div>{colDetail.median?.toFixed(2)}</div>
                    <div><div className="text-slate-500 text-xs">Std Dev</div>{colDetail.std?.toFixed(2)}</div>
                    <div><div className="text-slate-500 text-xs">Missing</div>{colDetail.missing}</div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-300">
                    <div className="text-slate-500 text-xs mb-1">Top values</div>
                    {Object.entries(colDetail.value_counts || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-white/5 py-1">
                        <span>{k}</span><span className="mono text-slate-400">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

