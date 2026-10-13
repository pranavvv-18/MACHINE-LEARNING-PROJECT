import React, { useState } from "react";
import { PageHeader, Card, Button, KPI, Loader, ErrorBanner, WhatIsThis } from "../components/UI.jsx";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

export default function Split() {
  const { featuresEngineered, splitInfo, setSplitInfo, setSplitDone } = usePipeline();
  const [testSize, setTestSize] = useState(0.2);
  const [method, setMethod] = useState("chronological");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.split(testSize, method);
      setSplitInfo(res);
      setSplitDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!featuresEngineered) {
    return (
      <div>
        <PageHeader title="Train / Test Split" />
        <Card><p className="text-slate-400 text-sm">Run feature engineering first.</p></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Train / Test Split"
        subtitle="For demand forecasting, a chronological split is preferred so the model is only ever tested on future, unseen dates."
      />
      <ErrorBanner message={error} />

      <WhatIsThis title="Why Chronological, Not Random?">
        Shuffling time-ordered demand data before splitting lets the model "see the future" during
        training (a form of leakage). A chronological split — earlier records for training, later
        records for testing — mirrors how the model will actually be used in production.
      </WhatIsThis>

      <Card className="my-6" title="Split Configuration">
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Test size</label>
            <select value={testSize} onChange={(e) => setTestSize(Number(e.target.value))} className="bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white">
              {[0.1, 0.15, 0.2, 0.25, 0.3].map((v) => (
                <option key={v} value={v} className="bg-[#0e1424]">{Math.round(v * 100)}%</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Split method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white">
              <option value="chronological" className="bg-[#0e1424]">Chronological (recommended)</option>
              <option value="random" className="bg-[#0e1424]">Random shuffle</option>
            </select>
          </div>
          <Button onClick={run} disabled={loading}>Run Split</Button>
        </div>
      </Card>

      {loading && <Loader text="Splitting dataset..." />}

      {splitInfo && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Training Records" value={splitInfo.training_records.toLocaleString()} />
          <KPI label="Testing Records" value={splitInfo.testing_records.toLocaleString()} accent="accent2" />
          <KPI label="Split" value={splitInfo.split_percentage} accent="pink" />
          <KPI label="Method" value={splitInfo.method} accent="amber" />
          {splitInfo.training_date_range?.[0] && (
            <>
              <KPI label="Training Range" value={`${splitInfo.training_date_range[0]} → ${splitInfo.training_date_range[1]}`} />
              <KPI label="Testing Range" value={`${splitInfo.testing_date_range[0]} → ${splitInfo.testing_date_range[1]}`} accent="accent2" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

