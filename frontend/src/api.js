import axios from "axios";

const client = axios.create({ baseURL: "/" });

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const detail =
      error?.response?.data?.detail || error?.message || "Something went wrong.";
    return Promise.reject(new Error(detail));
  }
);

export const api = {
  loadSample: () => client.post("/api/dataset/load-sample").then((r) => r.data),
  uploadDataset: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return client
      .post("/api/dataset/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  datasetInfo: () => client.get("/api/dataset/info").then((r) => r.data),
  setTarget: (target_column) =>
    client.post("/api/dataset/target", { target_column }).then((r) => r.data),
  columnDetail: (col) =>
    client.get(`/api/dataset/column/${encodeURIComponent(col)}`).then((r) => r.data),

  dataUnderstanding: () => client.get("/api/data-understanding").then((r) => r.data),
  preprocess: () => client.post("/api/preprocess").then((r) => r.data),
  featureEngineering: () => client.post("/api/feature-engineering").then((r) => r.data),
  eda: () => client.get("/api/eda").then((r) => r.data),

  split: (test_size, method) =>
    client.post("/api/split", { test_size, method }).then((r) => r.data),

  train: (cv_folds, use_timeseries) =>
    client.post("/api/train", { cv_folds, use_timeseries }).then((r) => r.data),

  comparison: () => client.get("/api/comparison").then((r) => r.data),
  evaluation: () => client.get("/api/evaluation").then((r) => r.data),
  coefficients: () => client.get("/api/coefficients").then((r) => r.data),

  featureColumns: () => client.get("/api/feature-columns").then((r) => r.data),
  predictionOptions: () => client.get("/api/prediction/options").then((r) => r.data),
  predict: (model, features) =>
    client.post("/predict", { model, ...features, features }).then((r) => r.data),

  monitoring: () => client.get("/api/monitoring").then((r) => r.data),
  lifecycle: () => client.get("/api/lifecycle").then((r) => r.data),
  projectInfo: () => client.get("/api/project-info").then((r) => r.data),
  health: () => client.get("/health").then((r) => r.data),
};
