import React, { useRef, useState } from "react";
import { PageHeader, Card, Button, Table, Loader, ErrorBanner } from "../components/UI.jsx";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

export default function Dataset() {
  const { datasetInfo, setDatasetInfo, setDatasetLoaded, setPreprocessed, setFeaturesEngineered, setSplitDone, setTrained } = usePipeline();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const resetDownstream = () => {
    setPreprocessed(false);
    setFeaturesEngineered(false);
    setSplitDone(false);
    setTrained(false);
  };

  const loadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await api.loadSample();
      setDatasetInfo(info);
      setDatasetLoaded(true);
      resetDownstream();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const info = await api.uploadDataset(file);
      setDatasetInfo(info);
      setDatasetLoaded(true);
      resetDownstream();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <PageHeader
        title="Dataset"
        subtitle="Load the built-in Store-Item demand dataset or upload your own CSV. The system will attempt to auto-detect the date column."
      />

      <ErrorBanner message={error} />

      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={loadSample} disabled={loading}>Load Sample Dataset</Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={loading}>
          Upload CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
      </div>

      {loading && <Loader text="Loading dataset..." />}

      {datasetInfo && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Source"><div className="text-sm text-slate-300">{datasetInfo.source}</div></Card>
            <Card title="Rows"><div className="text-2xl font-bold text-accent mono">{datasetInfo.rows.toLocaleString()}</div></Card>
            <Card title="Columns"><div className="text-2xl font-bold text-accent2 mono">{datasetInfo.columns}</div></Card>
          </div>

          <Card title="Column Names & Data Types">
            <Table
              columns={["Column", "Data Type"]}
              rows={datasetInfo.column_names.map((c) => [
                c,
                <span className="mono">{datasetInfo.dtypes[c]}</span>,
              ])}
            />
          </Card>

          <Card title="Preview — First 10 Records">
            <Table
              columns={datasetInfo.column_names}
              rows={datasetInfo.preview_head.map((row) => datasetInfo.column_names.map((c) => String(row[c])))}
            />
          </Card>
        </div>
      )}

      {!datasetInfo && !loading && (
        <Card>
          <p className="text-slate-400 text-sm">No dataset loaded yet. Load the sample dataset or upload your own CSV to begin.</p>
        </Card>
      )}
    </div>
  );
}

