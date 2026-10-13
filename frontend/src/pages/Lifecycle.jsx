import React, { useEffect, useState } from "react";
import { PageHeader, Card, Loader } from "../components/UI.jsx";
import { api } from "../api.js";

export default function Lifecycle() {
  const [stages, setStages] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => { api.lifecycle().then((r) => setStages(r.stages)); }, []);

  if (!stages) return <Loader text="Loading lifecycle..." />;

  return (
    <div>
      <PageHeader title="End-to-End ML Lifecycle" subtitle="Click any stage to see what happens in it." />
      <div className="grid md:grid-cols-3 gap-4">
        {stages.map((s) => (
          <Card key={s.step} title={`${s.step}. ${s.title}`} className="cursor-pointer" right={null}>
            <div onClick={() => setActive(active === s.step ? null : s.step)}>
              <p className="text-sm text-slate-400">{active === s.step ? s.description : "Click to expand"}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

