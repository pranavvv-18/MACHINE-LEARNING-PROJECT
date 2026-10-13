import React, { useEffect, useState } from "react";
import { PageHeader, Card, Button, Loader, ErrorBanner } from "../components/UI.jsx";
import { api } from "../api.js";
import { usePipeline } from "../PipelineContext.jsx";

export default function Prediction() {
  const { trained } = usePipeline();
  const [model, setModel] = useState("ridge");
  const [options, setOptions] = useState({
    stores: [],
    items: [],
    min_date: "",
    max_date: "",
    default_date: "",
    default_price: 25.0,
  });

  const [store, setStore] = useState("");
  const [item, setItem] = useState("");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [promo, setPromo] = useState("0");

  const [showFeatures, setShowFeatures] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trained) return;
    setFetchingOptions(true);
    api
      .predictionOptions()
      .then((opts) => {
        setOptions(opts);
        if (opts.stores?.length) setStore(opts.stores[0]);
        if (opts.items?.length) setItem(opts.items[0]);
        if (opts.default_date) setDate(opts.default_date);
        if (opts.default_price !== undefined) setPrice(String(opts.default_price));
      })
      .catch((e) => setError(e.message))
      .finally(() => setFetchingOptions(false));
  }, [trained]);

  const formatStoreLabel = (s) => {
    if (s === undefined || s === null || s === "") return "";
    const str = String(s);
    return str.toLowerCase().startsWith("store") ? str : `Store ${str}`;
  };

  const formatItemLabel = (it) => {
    if (it === undefined || it === null || it === "") return "";
    const str = String(it);
    return str.toLowerCase().startsWith("item") || str.toLowerCase().startsWith("product")
      ? str
      : `Item ${str}`;
  };

  const formatDisplayDate = (dStr) => {
    if (!dStr) return "—";
    try {
      const parts = String(dStr).split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  const submit = async () => {
    setError(null);

    // Form Validation
    if (store === "" || store === undefined || store === null) {
      setError("Please select a valid Store.");
      return;
    }
    if (item === "" || item === undefined || item === null) {
      setError("Please select a valid Product / Item.");
      return;
    }
    if (!date || String(date).trim() === "") {
      setError("Please select a valid Date.");
      return;
    }
    const numPrice = Number(price);
    if (price === "" || isNaN(numPrice) || numPrice < 0) {
      setError("Price must be a valid non-negative number.");
      return;
    }
    const numPromo = Number(promo);
    if (numPromo !== 0 && numPromo !== 1) {
      setError("Promotion must be 0 (No) or 1 (Yes).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.predict(model, {
        store,
        item,
        date,
        price: numPrice,
        promo: numPromo,
      });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!trained) {
    return (
      <div>
        <PageHeader title="Demand Prediction" />
        <Card>
          <p className="text-slate-400 text-sm">Train the models first on the Model Training page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Demand Prediction"
        subtitle="Generate product demand predictions using trained Ridge or Lasso regression models with automated feature engineering."
      />

      <ErrorBanner message={error} />

      {fetchingOptions && <Loader text="Loading available stores and products..." />}

      {/* Model Selection */}
      <Card className="mb-6" title="Select Model">
        <div className="flex gap-2">
          {["ridge", "lasso"].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setModel(n)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                model === n
                  ? "bg-accent/20 border-accent/40 text-white shadow-inner"
                  : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {n === "ridge" ? "Ridge Regression" : "Lasso Regression"}
            </button>
          ))}
        </div>
      </Card>

      {/* Simplified Input Form */}
      <Card className="mb-6" title="Input">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Store
            </label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white w-full focus:outline-none focus:border-accent"
            >
              {options.stores.length === 0 && <option value="">No stores found</option>}
              {options.stores.map((s) => (
                <option key={s} value={s} className="bg-[#0e1424]">
                  {formatStoreLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Product / Item
            </label>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white w-full focus:outline-none focus:border-accent"
            >
              {options.items.length === 0 && <option value="">No products found</option>}
              {options.items.map((it) => (
                <option key={it} value={it} className="bg-[#0e1424]">
                  {formatItemLabel(it)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white w-full focus:outline-none focus:border-accent [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Price (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter Price"
              className="bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white w-full focus:outline-none focus:border-accent font-mono"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Promotion
            </label>
            <select
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white w-full focus:outline-none focus:border-accent"
            >
              <option value="0" className="bg-[#0e1424]">
                No (0)
              </option>
              <option value="1" className="bg-[#0e1424]">
                Yes (1)
              </option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={submit} disabled={loading}>
            Generate Prediction
          </Button>
        </div>
      </Card>

      {loading && <Loader text="Calculating features & scoring model..." />}

      {/* Prediction Result */}
      {result && !loading && (
        <Card title="Prediction Result" className="border border-accent/30 mb-6">
          <div className="text-center py-5">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">
              PREDICTED PRODUCT DEMAND
            </div>
            <div className="text-5xl font-extrabold text-accent mono">
              {Number(result.prediction).toFixed(2)}
            </div>
            <div className="text-sm text-slate-400 mt-1 font-medium">units</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 text-sm">
            <div className="glass p-3 rounded-xl">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Selected Model</div>
              <div className="font-semibold text-white mt-1">{result.model}</div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Store</div>
              <div className="font-semibold text-white mt-1">{formatStoreLabel(result.store ?? store)}</div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Product</div>
              <div className="font-semibold text-white mt-1">{formatItemLabel(result.item ?? item)}</div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Date</div>
              <div className="font-semibold text-white mt-1">{formatDisplayDate(result.date ?? date)}</div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Price</div>
              <div className="font-semibold text-accent2 mono mt-1">
                ₹{Number(result.price ?? price).toFixed(2)}
              </div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Promotion</div>
              <div className="font-semibold text-white mt-1">
                {Number(result.promo ?? promo) === 1 ? "Yes" : "No"}
              </div>
            </div>
          </div>

          {result.generated_features && Object.keys(result.generated_features).length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowFeatures(!showFeatures)}
                className="flex items-center gap-2 text-xs font-semibold text-accent2 hover:text-accent transition-colors"
              >
                <span>Generated Features</span>
                <span className="text-[10px]">{showFeatures ? "▲" : "▼"}</span>
              </button>

              {showFeatures && (
                <div className="mt-3 p-4 glass rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mono">
                  {Object.entries(result.generated_features).map(([k, v]) => (
                    <div key={k} className="flex flex-col bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 text-[10px] uppercase font-mono">{k}</span>
                      <span className="text-white font-bold text-sm mt-0.5">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

