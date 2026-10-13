import os
from typing import Optional, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import ml_pipeline as ml

app = FastAPI(
    title="Product Demand Forecasting API",
    description="Ridge & Lasso Regression based demand forecasting REST service.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def err(e: Exception):
    raise HTTPException(status_code=400, detail=str(e))


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "healthy"}


# --------------------------------------------------------------------------
# Dataset
# --------------------------------------------------------------------------
@app.post("/api/dataset/load-sample")
def load_sample():
    sample_path = os.path.join(os.path.dirname(__file__), "data", "sample_demand_data.csv")
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample dataset not found. Run generate_sample_dataset.py first.")
    with open(sample_path, "rb") as f:
        content = f.read()
    try:
        return ml.load_dataset(content, "sample_demand_data.csv", "Built-in Store-Item Demand sample dataset")
    except Exception as e:
        err(e)


@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    content = await file.read()
    try:
        return ml.load_dataset(content, file.filename, f"User uploaded: {file.filename}")
    except Exception as e:
        err(e)


@app.get("/api/dataset/info")
def dataset_info():
    try:
        return ml.dataset_info()
    except Exception as e:
        err(e)


class TargetPayload(BaseModel):
    target_column: str


@app.post("/api/dataset/target")
def set_target(payload: TargetPayload):
    try:
        return ml.set_target_column(payload.target_column)
    except Exception as e:
        err(e)


@app.get("/api/dataset/column/{col}")
def column_detail(col: str):
    try:
        return ml.column_detail(col)
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# Data understanding
# --------------------------------------------------------------------------
@app.get("/api/data-understanding")
def data_understanding():
    try:
        return ml.data_understanding()
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# Preprocessing
# --------------------------------------------------------------------------
@app.post("/api/preprocess")
def preprocess():
    try:
        return ml.run_preprocessing()
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# Feature engineering
# --------------------------------------------------------------------------
@app.post("/api/feature-engineering")
def feature_engineering():
    try:
        return ml.run_feature_engineering()
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# EDA
# --------------------------------------------------------------------------
@app.get("/api/eda")
def eda():
    try:
        return ml.eda_data()
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# Train/test split
# --------------------------------------------------------------------------
class SplitPayload(BaseModel):
    test_size: float = 0.2
    method: str = "chronological"


@app.post("/api/split")
def split(payload: SplitPayload):
    try:
        return ml.run_split(payload.test_size, payload.method)
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# Training (cross-validation + hyperparameter tuning happens inside)
# --------------------------------------------------------------------------
class TrainPayload(BaseModel):
    cv_folds: int = 5
    use_timeseries: bool = True


@app.post("/api/train")
def train(payload: TrainPayload):
    try:
        return ml.train_models(payload.cv_folds, payload.use_timeseries)
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# Comparison / evaluation / coefficients
# --------------------------------------------------------------------------
@app.get("/api/comparison")
def comparison():
    try:
        return ml.comparison()
    except Exception as e:
        err(e)


@app.get("/api/evaluation")
def evaluation():
    try:
        return ml.evaluation_detail()
    except Exception as e:
        err(e)


@app.get("/api/coefficients")
def coefficients():
    try:
        return ml.coefficients_detail()
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# Prediction (REST spec from project brief)
# --------------------------------------------------------------------------
class PredictPayload(BaseModel):
    model: str
    features: Optional[dict] = None
    store: Optional[Any] = None
    item: Optional[Any] = None
    date: Optional[str] = None
    price: Optional[float] = None
    promo: Optional[int] = None


@app.post("/predict")
def predict(payload: PredictPayload):
    try:
        features = dict(payload.features or {})
        if payload.store is not None:
            features["store"] = payload.store
        if payload.item is not None:
            features["item"] = payload.item
        if payload.date is not None:
            features["date"] = payload.date
        if payload.price is not None:
            features["price"] = payload.price
        if payload.promo is not None:
            features["promo"] = payload.promo

        result = ml.predict(payload.model, features)
        return result
    except Exception as e:
        err(e)


@app.get("/api/prediction/options")
def prediction_options():
    try:
        return ml.get_prediction_options()
    except Exception as e:
        err(e)


@app.get("/api/feature-columns")
def feature_columns():
    return {"feature_columns": ml.state.model_feature_cols, "target_column": ml.state.target_col}


# --------------------------------------------------------------------------
# Monitoring
# --------------------------------------------------------------------------
@app.get("/api/monitoring")
def monitoring():
    try:
        return ml.monitoring_data()
    except Exception as e:
        err(e)


# --------------------------------------------------------------------------
# Static / informational endpoints
# --------------------------------------------------------------------------
@app.get("/api/lifecycle")
def lifecycle():
    return {
        "stages": [
            {"step": 1, "title": "Dataset Collection", "description": "Load a historical product-demand dataset (upload CSV or use the built-in sample)."},
            {"step": 2, "title": "Data Understanding", "description": "Inspect rows, columns, data types, missing values and statistical summaries."},
            {"step": 3, "title": "Preprocessing", "description": "Remove duplicates, impute missing values, parse dates - identical logic reused at inference time."},
            {"step": 4, "title": "EDA", "description": "Visualize demand distribution, trends, correlations and category-wise patterns."},
            {"step": 5, "title": "Feature Engineering", "description": "Create calendar features and leakage-safe lag/rolling historical demand features."},
            {"step": 6, "title": "Train/Test Split", "description": "Chronological split so the model is tested only on unseen future dates."},
            {"step": 7, "title": "Cross-Validation", "description": "TimeSeriesSplit / K-Fold cross-validation on the training set."},
            {"step": 8, "title": "Model Training", "description": "Ridge and Lasso Regression trained with GridSearchCV over alpha."},
            {"step": 9, "title": "Evaluation", "description": "MAE, MSE, RMSE and R2 computed on train, CV and test sets."},
            {"step": 10, "title": "Prediction", "description": "User-supplied inputs are transformed and scored by the trained pipeline."},
            {"step": 11, "title": "Deployment", "description": "Preprocessing + model packaged with joblib and served via a REST API (/predict, /health)."},
            {"step": 12, "title": "Monitoring", "description": "Track prediction volume, distribution and basic input drift."},
        ]
    }


@app.get("/api/project-info")
def project_info():
    return {
        "title": "Product Demand Forecasting Using Ridge and Lasso Regression",
        "problem_definition": "Businesses need to estimate future product demand from historical sales information to plan inventory, reduce stockouts/overstock and support purchasing decisions.",
        "users": ["Retailers", "Store managers", "Inventory planners", "Business analysts"],
        "algorithms_used": ["Ridge Regression (L2 regularization)", "Lasso Regression (L1 regularization)"],
        "preprocessing": ["Duplicate removal", "Missing value imputation", "Date parsing", "One-hot encoding", "StandardScaler feature scaling"],
        "feature_engineering": ["year", "month", "day", "day_of_week", "week_of_year", "quarter", "lag_1 (previous period demand)", "rolling_mean_7 (past 7-period rolling average)"],
        "evaluation_metrics": ["MAE", "MSE", "RMSE", "R2"],
        "technology_stack": {
            "frontend": ["React", "Tailwind CSS", "Recharts"],
            "backend": ["FastAPI", "Python"],
            "ml": ["pandas", "numpy", "scikit-learn", "joblib"],
        },
        "excluded_by_design": [
            "Deep learning / neural networks", "LSTM", "ARIMA", "Prophet", "XGBoost",
            "Random Forest", "Decision Trees", "Clustering", "PCA",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
