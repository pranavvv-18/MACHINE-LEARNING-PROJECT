import React, { useEffect, useState } from "react";
import { PageHeader, Card, Loader } from "../components/UI.jsx";
import { api } from "../api.js";

export default function ProjectInfo() {
  const [info, setInfo] = useState(null);

  useEffect(() => { api.projectInfo().then(setInfo); }, []);

  if (!info) return <Loader text="Loading project information..." />;

  return (
    <div>
      <PageHeader title={info.title} badge="Project Documentation" />

      <Card className="mb-6" title="Project Overview">
        <p className="text-sm text-slate-300">{info.problem_definition}</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card title="Algorithms Used">
          <ul className="text-sm text-slate-300 space-y-1">
            {info.algorithms_used.map((a) => <li key={a}>• {a}</li>)}
          </ul>
        </Card>
        <Card title="Users">
          <ul className="text-sm text-slate-300 space-y-1">
            {info.users.map((a) => <li key={a}>• {a}</li>)}
          </ul>
        </Card>
        <Card title="Preprocessing">
          <ul className="text-sm text-slate-300 space-y-1">
            {info.preprocessing.map((a) => <li key={a}>• {a}</li>)}
          </ul>
        </Card>
        <Card title="Feature Engineering">
          <ul className="text-sm text-slate-300 space-y-1">
            {info.feature_engineering.map((a) => <li key={a} className="mono text-xs">• {a}</li>)}
          </ul>
        </Card>
        <Card title="Evaluation Metrics">
          <ul className="text-sm text-slate-300 space-y-1">
            {info.evaluation_metrics.map((a) => <li key={a}>• {a}</li>)}
          </ul>
        </Card>
        <Card title="Technology Stack">
          <div className="text-sm text-slate-300 space-y-2">
            <div><b className="text-accent2">Frontend:</b> {info.technology_stack.frontend.join(", ")}</div>
            <div><b className="text-accent2">Backend:</b> {info.technology_stack.backend.join(", ")}</div>
            <div><b className="text-accent2">ML:</b> {info.technology_stack.ml.join(", ")}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

