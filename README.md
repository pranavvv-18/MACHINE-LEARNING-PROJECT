# Product Demand Forecasting Using Ridge and Lasso Regression

An academic, full-stack ML web application demonstrating the complete machine
learning lifecycle for product demand forecasting, built strictly around
**Ridge Regression** and **Lasso Regression** (scikit-learn), with real data
processing, real model training, real predictions and real evaluation.

Aligned to Course Outcomes:
- **CO1** – End-to-end ML lifecycle
- **CO2** – Linear regression, Ridge, Lasso, regularization, feature scaling
- **CO5** – Train/test split, cross-validation, regression metrics, hyperparameter search
- **CO6** – Model packaging, REST-based serving, training-serving skew prevention, basic monitoring

---

## 1. Folder Structure

```
project/
├── backend/
│   ├── main.py                     # FastAPI app (all REST endpoints)
│   ├── ml_pipeline.py               # All ML logic (CO1/CO2/CO5/CO6)
│   ├── generate_sample_dataset.py   # Creates the built-in demo dataset
│   ├── requirements.txt
│   ├── data/
│   │   └── sample_demand_data.csv   # Generated sample dataset
│   └── saved_models/                # joblib pipelines saved here after training
│       ├── ridge_pipeline.joblib
│       ├── lasso_pipeline.joblib
│       └── metadata.json
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js                   # Axios client for all backend calls
        ├── PipelineContext.jsx       # Shared pipeline state across pages
        ├── index.css
        ├── components/
        │   ├── Sidebar.jsx
        │   └── UI.jsx                # Card, KPI, Table, Button, etc.
        └── pages/
            ├── Dashboard.jsx
            ├── Dataset.jsx
            ├── DataUnderstanding.jsx
            ├── Preprocessing.jsx
            ├── EDA.jsx
            ├── FeatureEngineering.jsx
            ├── Split.jsx
            ├── Training.jsx
            ├── Comparison.jsx
            ├── Evaluation.jsx
            ├── Prediction.jsx
            ├── Deployment.jsx
            ├── Monitoring.jsx
            ├── ProjectInfo.jsx
            └── Lifecycle.jsx
```

---

## 2. Backend Setup (FastAPI + scikit-learn)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Generate the built-in sample dataset (Store-Item demand data)
python generate_sample_dataset.py

# Run the API server
python main.py
# or
uvicorn main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**
Interactive API docs (Swagger UI) at **http://localhost:8000/docs**

---

## 3. Frontend Setup (React + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**
(Vite is configured to proxy `/api`, `/predict` and `/health` to
`http://localhost:8000`, so start the backend first.)

---

## 4. Using the Application

Walk through the sidebar top to bottom:

1. **Dataset** – click "Load Sample Dataset" (or upload your own CSV).
2. **Data Understanding** – inspect rows, types, missing values, stats.
3. **Preprocessing** – click "Run Preprocessing" (dedup, impute, encode, scale).
4. **EDA** – auto-generated charts from the cleaned dataset.
5. **Feature Engineering** – click "Generate Features" (calendar + lag/rolling features).
6. **Train/Test Split** – choose chronological/random split, click "Run Split".
7. **Model Training** – choose CV folds/strategy, click "Train Ridge & Lasso"
   (runs `GridSearchCV` over `alpha ∈ {0.01, 0.1, 1, 10, 100}`).
8. **Ridge vs Lasso** – side-by-side metric & coefficient comparison.
9. **Evaluation** – MAE/MSE/RMSE/R², actual-vs-predicted and residual plots.
10. **Prediction** – enter feature values, choose a model, get a live prediction.
11. **Deployment** – REST API documentation (`POST /predict`, `GET /health`).
12. **Monitoring** – prediction volume, distribution, and basic drift warnings.
13. **Project Information** – full write-up and CO mapping for viva/submission.

Each page's action must generally be completed once (top to bottom) before
later pages unlock, mirroring the real ML lifecycle: Dataset → Preprocessing →
Feature Engineering → Split → Training → Evaluation/Prediction.

---

## 5. REST API Reference

### `GET /health`
```json
{ "status": "healthy" }
```

### `POST /api/dataset/load-sample`
Loads the built-in sample dataset. No body required.

### `POST /api/dataset/upload` (multipart/form-data, field `file`)
Uploads a custom CSV dataset.

### `POST /api/preprocess`
Runs preprocessing on the currently loaded dataset.

### `POST /api/feature-engineering`
Generates calendar and lag/rolling demand features.

### `POST /api/split`
```json
{ "test_size": 0.2, "method": "chronological" }
```

### `POST /api/train`
```json
{ "cv_folds": 5, "use_timeseries": true }
```
Trains Ridge and Lasso with `GridSearchCV`, saves both pipelines to
`backend/saved_models/*.joblib`.

### `POST /predict`
```json
{
  "model": "ridge",
  "features": {
    "store": 3, "item": 5, "price": 24.5, "promo": 0,
    "year": 2024, "month": 1, "day": 15, "day_of_week": 0,
    "week_of_year": 3, "quarter": 1, "lag_1": 62.3, "rolling_mean_7": 58.1
  }
}
```
Response:
```json
{ "model": "Ridge Regression", "prediction": 245.73, "timestamp": "..." }
```

### `GET /api/monitoring`
Returns prediction count, average/min/max predicted demand, recent
predictions, and any input-distribution drift warnings.

Full list of additional read-only endpoints (`/api/dataset/info`,
`/api/data-understanding`, `/api/eda`, `/api/comparison`, `/api/evaluation`,
`/api/coefficients`, `/api/lifecycle`, `/api/project-info`,
`/api/feature-columns`) is documented interactively at `/docs`.

---

## 6. Notes on Design Choices

- **Pipeline + ColumnTransformer**: the exact same preprocessing
  (`SimpleImputer` → `OneHotEncoder`/`StandardScaler`) is embedded inside the
  same `sklearn.Pipeline` as the Ridge/Lasso model, and that single object is
  what gets saved with `joblib` and reloaded for `/predict`. This is what
  prevents training-serving skew (CO6).
- **Chronological split + TimeSeriesSplit**: because demand data is
  time-ordered, both the train/test split and cross-validation avoid
  shuffling by default, so the model is never validated on data "from the
  future."
- **No target leakage**: lag/rolling features are computed with `shift(1)`
  before any aggregation, so no feature can see the value it's predicting.
- **Only Ridge and Lasso**: no deep learning, tree ensembles, ARIMA, clustering
  or dimensionality-reduction algorithms are used anywhere in the codebase, in
  line with the syllabus restrictions.

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend shows network errors | Make sure the backend is running on port 8000 before `npm run dev`. |
| "No dataset loaded" errors | Visit the Dataset page and click "Load Sample Dataset" first. |
| Training is slow | Reduce CV folds, or note that this dataset intentionally has 40k+ rows to make the ML meaningful. |
| CSV upload fails | Ensure the file has a header row and at least one numeric column that can serve as the target (demand/sales). |
