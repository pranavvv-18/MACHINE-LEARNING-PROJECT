import React, { createContext, useContext, useState } from "react";

const PipelineContext = createContext(null);

export function PipelineProvider({ children }) {
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [preprocessed, setPreprocessed] = useState(false);
  const [featuresEngineered, setFeaturesEngineered] = useState(false);
  const [splitDone, setSplitDone] = useState(false);
  const [trained, setTrained] = useState(false);

  const [datasetInfo, setDatasetInfo] = useState(null);
  const [splitInfo, setSplitInfo] = useState(null);
  const [trainResults, setTrainResults] = useState(null);
  const [featureColumns, setFeatureColumns] = useState([]);

  const value = {
    datasetLoaded, setDatasetLoaded,
    preprocessed, setPreprocessed,
    featuresEngineered, setFeaturesEngineered,
    splitDone, setSplitDone,
    trained, setTrained,
    datasetInfo, setDatasetInfo,
    splitInfo, setSplitInfo,
    trainResults, setTrainResults,
    featureColumns, setFeatureColumns,
  };

  return <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>;
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}
