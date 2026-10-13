import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import { PipelineProvider } from "./PipelineContext.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Dataset from "./pages/Dataset.jsx";
import DataUnderstanding from "./pages/DataUnderstanding.jsx";
import Preprocessing from "./pages/Preprocessing.jsx";
import EDA from "./pages/EDA.jsx";
import FeatureEngineering from "./pages/FeatureEngineering.jsx";
import Split from "./pages/Split.jsx";
import Training from "./pages/Training.jsx";
import Comparison from "./pages/Comparison.jsx";
import Prediction from "./pages/Prediction.jsx";
import Monitoring from "./pages/Monitoring.jsx";
import ProjectInfo from "./pages/ProjectInfo.jsx";
import Lifecycle from "./pages/Lifecycle.jsx";

export default function App() {
  return (
    <PipelineProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 max-w-[1400px]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dataset" element={<Dataset />} />
            <Route path="/understanding" element={<DataUnderstanding />} />
            <Route path="/preprocessing" element={<Preprocessing />} />
            <Route path="/eda" element={<EDA />} />
            <Route path="/features" element={<FeatureEngineering />} />
            <Route path="/split" element={<Split />} />
            <Route path="/training" element={<Training />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/info" element={<ProjectInfo />} />
            <Route path="/lifecycle" element={<Lifecycle />} />
          </Routes>
        </main>
      </div>
    </PipelineProvider>
  );
}

