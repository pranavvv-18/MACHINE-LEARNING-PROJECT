"""
Core Machine Learning logic for the Product Demand Forecasting project.

Implements the full lifecycle using ONLY the algorithms permitted by the
syllabus: Ridge Regression and Lasso Regression (scikit-learn), with a
sklearn Pipeline + ColumnTransformer so that identical preprocessing is
applied during training, testing and REST API inference (avoids
training-serving skew -> CO6).
"""
import io
import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge, Lasso
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit, KFold
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

ALPHA_GRID = [0.01, 0.1, 1, 10, 100]


# --------------------------------------------------------------------------
# In-memory application state (single-session academic demo).
# --------------------------------------------------------------------------
class AppState:
    def __init__(self):
        self.reset()

    def reset(self):
        self.raw_df: pd.DataFrame | None = None
        self.dataset_source = None
        self.date_col = None
        self.target_col = None
        self.numeric_cols = []
        self.categorical_cols = []

        self.engineered_df: pd.DataFrame | None = None
        self.feature_table = []  # list of dicts: name/type/description/used/reason
        self.model_feature_cols = []

        self.X_train = self.X_test = self.y_train = self.y_test = None
        self.train_dates = self.test_dates = None
        self.split_info = {}

        self.cv_results = {}
        self.models = {}  # {"ridge": {...}, "lasso": {...}}
        self.preprocessor = None

        self.predictions_log = []  # monitoring
        self.baseline_input_stats = None

        self.preprocess_before = {}
        self.preprocess_after = {}


state = AppState()


# --------------------------------------------------------------------------
# 1. Dataset loading / understanding
# --------------------------------------------------------------------------
def load_dataset(file_bytes: bytes, filename: str, source_label: str):
    df = pd.read_csv(io.BytesIO(file_bytes))
    if df.empty:
        raise ValueError("Uploaded CSV is empty.")
    state.reset()
    state.raw_df = df
    state.dataset_source = source_label

    # Try to auto-detect date / target columns
    date_candidates = [c for c in df.columns if "date" in c.lower()]
    state.date_col = date_candidates[0] if date_candidates else None

    target_candidates = [c for c in df.columns if c.lower() in ("sales", "demand", "quantity", "qty")]
    state.target_col = target_candidates[0] if target_candidates else df.select_dtypes(include=np.number).columns[-1]

    return dataset_info()


def set_target_column(target: str):
    if state.raw_df is None:
        raise ValueError("No dataset loaded.")
    if target not in state.raw_df.columns:
        raise ValueError(f"Column '{target}' not found in dataset.")
    state.target_col = target
    return dataset_info()


def dataset_info():
    df = state.raw_df
    if df is None:
        raise ValueError("No dataset loaded.")
    dtypes = {c: str(df[c].dtype) for c in df.columns}
    return {
        "source": state.dataset_source,
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": list(df.columns),
        "dtypes": dtypes,
        "target_column": state.target_col,
        "date_column": state.date_col,
        "feature_columns": [c for c in df.columns if c not in (state.target_col,)],
        "preview_head": json.loads(df.head(10).to_json(orient="records")),
    }


def data_understanding():
    df = state.raw_df
    if df is None:
        raise ValueError("No dataset loaded.")

    numeric_df = df.select_dtypes(include=np.number)
    summary = {}
    for c in numeric_df.columns:
        col = numeric_df[c]
        summary[c] = {
            "min": float(col.min()) if col.notna().any() else None,
            "max": float(col.max()) if col.notna().any() else None,
            "mean": float(col.mean()) if col.notna().any() else None,
            "median": float(col.median()) if col.notna().any() else None,
            "std": float(col.std()) if col.notna().any() else None,
            "missing": int(col.isna().sum()),
            "unique": int(col.nunique()),
        }

    non_numeric = [c for c in df.columns if c not in numeric_df.columns]
    for c in non_numeric:
        summary[c] = {
            "missing": int(df[c].isna().sum()),
            "unique": int(df[c].nunique()),
            "top_values": df[c].value_counts().head(5).to_dict(),
        }

    return {
        "total_records": int(df.shape[0]),
        "total_features": int(df.shape[1]),
        "missing_values_total": int(df.isna().sum().sum()),
        "duplicate_records": int(df.duplicated().sum()),
        "columns": summary,
    }


def column_detail(col: str):
    df = state.raw_df
    if col not in df.columns:
        raise ValueError("Column not found.")
    series = df[col]
    result = {"name": col, "dtype": str(series.dtype), "missing": int(series.isna().sum())}
    if pd.api.types.is_numeric_dtype(series):
        result.update(
            {
                "min": float(series.min()) if series.notna().any() else None,
                "max": float(series.max()) if series.notna().any() else None,
                "mean": float(series.mean()) if series.notna().any() else None,
                "median": float(series.median()) if series.notna().any() else None,
                "std": float(series.std()) if series.notna().any() else None,
                "histogram": np.histogram(series.dropna(), bins=15)[0].tolist(),
            }
        )
    else:
        result["value_counts"] = series.value_counts().head(15).to_dict()
    return result


# --------------------------------------------------------------------------
# 2. Preprocessing
# --------------------------------------------------------------------------
def run_preprocessing():
    df = state.raw_df
    if df is None:
        raise ValueError("No dataset loaded.")

    before = {
        "rows": int(df.shape[0]),
        "missing_values": int(df.isna().sum().sum()),
        "duplicate_records": int(df.duplicated().sum()),
    }

    clean = df.copy()

    # 1. remove duplicates
    clean = clean.drop_duplicates()

    # 2. parse date column
    if state.date_col and state.date_col in clean.columns:
        clean[state.date_col] = pd.to_datetime(clean[state.date_col], errors="coerce")
        clean = clean.dropna(subset=[state.date_col])

    # 3. handle missing target rows -> drop (cannot train without label)
    if state.target_col in clean.columns:
        clean = clean.dropna(subset=[state.target_col])

    # 4. Identify numeric / categorical columns (excluding date & target)
    feature_cols = [c for c in clean.columns if c not in (state.target_col, state.date_col)]
    numeric_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(clean[c])]
    categorical_cols = [c for c in feature_cols if c not in numeric_cols]

    # 5. impute missing numeric values with median (do NOT hardcode values)
    for c in numeric_cols:
        if clean[c].isna().any():
            clean[c] = clean[c].fillna(clean[c].median())

    # 6. impute missing categorical values with mode
    for c in categorical_cols:
        if clean[c].isna().any():
            mode_val = clean[c].mode()
            clean[c] = clean[c].fillna(mode_val.iloc[0] if not mode_val.empty else "unknown")

    # 7. simple outlier flag using IQR (report only, do not silently drop rows
    #    for a demand-forecasting problem since spikes can be genuine demand)
    outlier_report = {}
    for c in numeric_cols:
        q1, q3 = clean[c].quantile(0.25), clean[c].quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outlier_count = int(((clean[c] < lower) | (clean[c] > upper)).sum())
        outlier_report[c] = outlier_count

    state.numeric_cols = numeric_cols
    state.categorical_cols = categorical_cols
    state.engineered_df = clean.sort_values(state.date_col) if state.date_col else clean

    after = {
        "rows": int(clean.shape[0]),
        "missing_values": int(clean.isna().sum().sum()),
        "duplicate_records": int(clean.duplicated().sum()),
        "outliers_by_column": outlier_report,
    }

    state.preprocess_before = before
    state.preprocess_after = after

    return {
        "before": before,
        "after": after,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "note": (
            "Preprocessing (duplicate removal, missing-value imputation, "
            "categorical encoding, scaling) is wrapped in a single sklearn "
            "Pipeline + ColumnTransformer so training, testing and REST API "
            "inference all use exactly the same transformation logic."
        ),
    }


# --------------------------------------------------------------------------
# 3. Feature Engineering
# --------------------------------------------------------------------------
def run_feature_engineering():
    if state.engineered_df is None:
        run_preprocessing()

    df = state.engineered_df.copy()
    feature_table = []

    date_features = []
    if state.date_col and state.date_col in df.columns:
        df["year"] = df[state.date_col].dt.year
        df["month"] = df[state.date_col].dt.month
        df["day"] = df[state.date_col].dt.day
        df["day_of_week"] = df[state.date_col].dt.dayofweek
        df["week_of_year"] = df[state.date_col].dt.isocalendar().week.astype(int)
        df["quarter"] = df[state.date_col].dt.quarter
        date_features = ["year", "month", "day", "day_of_week", "week_of_year", "quarter"]
        for f in date_features:
            feature_table.append(
                {
                    "name": f,
                    "type": "engineered (date)",
                    "description": f"Extracted from '{state.date_col}'",
                    "status": "USED",
                    "reason": "Captures seasonality / calendar effects in demand.",
                }
            )

    # lag / rolling features (grouped by identifier columns if present, else global)
    lag_features = []
    group_cols = [c for c in ["store", "item", "product"] if c in df.columns]
    if state.date_col and state.target_col in df.columns:
        df = df.sort_values((group_cols + [state.date_col]) if group_cols else [state.date_col])
        grouper = df.groupby(group_cols) if group_cols else None

        def shifted(series, periods):
            return series.shift(periods)

        if grouper is not None:
            df["lag_1"] = grouper[state.target_col].shift(1)
            df["rolling_mean_7"] = grouper[state.target_col].transform(
                lambda s: s.shift(1).rolling(window=7, min_periods=1).mean()
            )
        else:
            df["lag_1"] = df[state.target_col].shift(1)
            df["rolling_mean_7"] = df[state.target_col].shift(1).rolling(window=7, min_periods=1).mean()

        lag_features = ["lag_1", "rolling_mean_7"]
        for f in lag_features:
            feature_table.append(
                {
                    "name": f,
                    "type": "engineered (historical demand)",
                    "description": "Uses ONLY previous observations (shift(1) applied first) to avoid target leakage.",
                    "status": "USED",
                    "reason": "Recent historical demand is a strong predictor of near-future demand.",
                }
            )
        df = df.dropna(subset=lag_features)

    # original raw feature columns
    for c in state.numeric_cols + state.categorical_cols:
        feature_table.append(
            {
                "name": c,
                "type": "numeric" if c in state.numeric_cols else "categorical",
                "description": "Original dataset column",
                "status": "USED",
                "reason": "Directly informative for demand prediction.",
            }
        )

    if state.date_col:
        feature_table.append(
            {
                "name": state.date_col,
                "type": "datetime",
                "description": "Raw date column",
                "status": "REMOVED",
                "reason": "Replaced by extracted calendar features (year, month, day, etc.).",
            }
        )

    model_feature_cols = state.numeric_cols + state.categorical_cols + date_features + lag_features
    # target must not be in features
    model_feature_cols = [c for c in model_feature_cols if c != state.target_col]

    state.engineered_df = df
    state.model_feature_cols = model_feature_cols
    state.feature_table = feature_table

    return {
        "feature_table": feature_table,
        "model_feature_columns": model_feature_cols,
        "rows_after_feature_engineering": int(df.shape[0]),
    }


# --------------------------------------------------------------------------
# 4. Train / Test Split
# --------------------------------------------------------------------------
def run_split(test_size: float = 0.2, method: str = "chronological"):
    if state.engineered_df is None or not state.model_feature_cols:
        run_feature_engineering()

    df = state.engineered_df
    feature_cols = state.model_feature_cols
    target = state.target_col

    if state.date_col and method == "chronological":
        df_sorted = df.sort_values(state.date_col)
        split_idx = int(len(df_sorted) * (1 - test_size))
        train_df = df_sorted.iloc[:split_idx]
        test_df = df_sorted.iloc[split_idx:]
        train_dates = (str(train_df[state.date_col].min().date()), str(train_df[state.date_col].max().date()))
        test_dates = (str(test_df[state.date_col].min().date()), str(test_df[state.date_col].max().date()))
    else:
        df_shuffled = df.sample(frac=1, random_state=42)
        split_idx = int(len(df_shuffled) * (1 - test_size))
        train_df = df_shuffled.iloc[:split_idx]
        test_df = df_shuffled.iloc[split_idx:]
        train_dates = test_dates = (None, None)

    state.X_train = train_df[feature_cols]
    state.y_train = train_df[target]
    state.X_test = test_df[feature_cols]
    state.y_test = test_df[target]

    state.split_info = {
        "method": method,
        "training_records": int(len(train_df)),
        "testing_records": int(len(test_df)),
        "split_percentage": f"{int((1 - test_size) * 100)}/{int(test_size * 100)}",
        "training_date_range": train_dates,
        "testing_date_range": test_dates,
    }
    return state.split_info


# --------------------------------------------------------------------------
# 5. Preprocessing pipeline (ColumnTransformer) shared by CV/train/predict
# --------------------------------------------------------------------------
def build_preprocessor():
    numeric_features = [c for c in state.model_feature_cols if c in state.numeric_cols or c in
                         ("year", "month", "day", "day_of_week", "week_of_year", "quarter", "lag_1", "rolling_mean_7")]
    categorical_features = [c for c in state.model_feature_cols if c in state.categorical_cols]

    numeric_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])

    preprocessor = ColumnTransformer(transformers=[
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features),
    ])
    state.preprocessor = preprocessor
    return preprocessor, numeric_features, categorical_features


# --------------------------------------------------------------------------
# 6. Cross-validation + hyperparameter tuning + training
# --------------------------------------------------------------------------
def _make_cv(n_splits: int, use_timeseries: bool):
    if use_timeseries:
        return TimeSeriesSplit(n_splits=n_splits)
    return KFold(n_splits=n_splits, shuffle=True, random_state=42)


def train_models(cv_folds: int = 5, use_timeseries: bool = True):
    if state.X_train is None:
        raise ValueError("Run train/test split before training.")

    preprocessor, num_feats, cat_feats = build_preprocessor()
    cv = _make_cv(cv_folds, use_timeseries)

    results = {}
    for name, Estimator in (("ridge", Ridge), ("lasso", Lasso)):
        pipe = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", Estimator(random_state=42) if name == "lasso" else Estimator()),
        ])
        param_grid = {"model__alpha": ALPHA_GRID}
        search = GridSearchCV(
            pipe, param_grid, scoring="neg_root_mean_squared_error",
            cv=cv, n_jobs=-1, return_train_score=True,
        )
        search.fit(state.X_train, state.y_train)

        best_pipe = search.best_estimator_
        cv_res = search.cv_results_
        best_idx = search.best_index_

        train_pred = best_pipe.predict(state.X_train)
        test_pred = best_pipe.predict(state.X_test)

        train_metrics = compute_metrics(state.y_train, train_pred)
        test_metrics = compute_metrics(state.y_test, test_pred)

        # coefficients
        feature_names = list(best_pipe.named_steps["preprocessor"].get_feature_names_out())
        coefs = best_pipe.named_steps["model"].coef_.tolist()

        results[name] = {
            "best_alpha": float(search.best_params_["model__alpha"]),
            "tested_alphas": ALPHA_GRID,
            "cv_mean_rmse": float(-cv_res["mean_test_score"][best_idx]),
            "cv_std_rmse": float(cv_res["std_test_score"][best_idx]),
            "cv_folds": cv_folds,
            "cv_strategy": "TimeSeriesSplit" if use_timeseries else "KFold",
            "all_alpha_scores": [
                {"alpha": a, "mean_rmse": float(-s)}
                for a, s in zip(ALPHA_GRID, cv_res["mean_test_score"])
            ],
            "train_metrics": train_metrics,
            "test_metrics": test_metrics,
            "feature_names": feature_names,
            "coefficients": coefs,
            "non_zero_coefficients": int(np.sum(np.abs(np.array(coefs)) > 1e-8)),
            "total_coefficients": len(coefs),
        }

        state.models[name] = {"pipeline": best_pipe, "result": results[name]}

        # persist pipeline (preprocessing + model together -> CO6)
        joblib.dump(best_pipe, os.path.join(MODEL_DIR, f"{name}_pipeline.joblib"))

    meta = {
        "feature_columns": state.model_feature_cols,
        "target_column": state.target_col,
        "date_column": state.date_col,
        "trained_at": datetime.utcnow().isoformat(),
    }
    with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
        json.dump(meta, f)

    # baseline stats for drift monitoring
    state.baseline_input_stats = {
        c: {"mean": float(state.X_train[c].mean()), "std": float(state.X_train[c].std())}
        for c in state.X_train.columns
        if pd.api.types.is_numeric_dtype(state.X_train[c])
    }

    state.cv_results = results
    return results


def compute_metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = float(np.sqrt(mse))
    r2 = r2_score(y_true, y_pred)
    return {"mae": float(mae), "mse": float(mse), "rmse": rmse, "r2": float(r2)}


# --------------------------------------------------------------------------
# 7. Comparison / Evaluation / Coefficients
# --------------------------------------------------------------------------
def comparison():
    if not state.cv_results:
        raise ValueError("Train models first.")
    r = state.cv_results
    return {
        "ridge": {
            "best_alpha": r["ridge"]["best_alpha"],
            "cv_rmse": r["ridge"]["cv_mean_rmse"],
            "train": r["ridge"]["train_metrics"],
            "test": r["ridge"]["test_metrics"],
            "non_zero_coefficients": r["ridge"]["non_zero_coefficients"],
            "total_coefficients": r["ridge"]["total_coefficients"],
        },
        "lasso": {
            "best_alpha": r["lasso"]["best_alpha"],
            "cv_rmse": r["lasso"]["cv_mean_rmse"],
            "train": r["lasso"]["train_metrics"],
            "test": r["lasso"]["test_metrics"],
            "non_zero_coefficients": r["lasso"]["non_zero_coefficients"],
            "total_coefficients": r["lasso"]["total_coefficients"],
        },
    }


def evaluation_detail():
    if not state.cv_results:
        raise ValueError("Train models first.")
    out = {}
    for name in ("ridge", "lasso"):
        res = state.cv_results[name]
        pipe = state.models[name]["pipeline"]
        actual = state.y_test.tolist()
        predicted = pipe.predict(state.X_test).tolist()
        residuals = [a - p for a, p in zip(actual, predicted)]
        out[name] = {
            "train_metrics": res["train_metrics"],
            "test_metrics": res["test_metrics"],
            "cv_mean_rmse": res["cv_mean_rmse"],
            "cv_std_rmse": res["cv_std_rmse"],
            "actual_vs_predicted": {"actual": actual[:300], "predicted": predicted[:300]},
            "residuals": residuals[:300],
        }
    return out


def coefficients_detail():
    if not state.cv_results:
        raise ValueError("Train models first.")
    ridge = state.cv_results["ridge"]
    lasso = state.cv_results["lasso"]
    names = ridge["feature_names"]
    rows = []
    for i, n in enumerate(names):
        rows.append({
            "feature": n,
            "ridge_coefficient": ridge["coefficients"][i] if i < len(ridge["coefficients"]) else None,
            "lasso_coefficient": lasso["coefficients"][i] if i < len(lasso["coefficients"]) else None,
        })
    return {"rows": rows, "lasso_zeroed_features": [r["feature"] for r in rows if r["lasso_coefficient"] is not None and abs(r["lasso_coefficient"]) < 1e-8]}


# --------------------------------------------------------------------------
# 8. EDA
# --------------------------------------------------------------------------
def eda_data():
    df = state.engineered_df if state.engineered_df is not None else state.raw_df
    if df is None:
        raise ValueError("No dataset loaded.")
    target = state.target_col

    result = {}
    if target in df.columns:
        result["demand_histogram"] = {
            "counts": np.histogram(df[target].dropna(), bins=20)[0].tolist(),
            "bin_edges": np.histogram(df[target].dropna(), bins=20)[1].tolist(),
        }

    if state.date_col and state.date_col in df.columns and target in df.columns:
        ts = df.groupby(state.date_col)[target].sum().reset_index().sort_values(state.date_col)
        result["demand_over_time"] = {
            "dates": ts[state.date_col].astype(str).tolist()[-365:],
            "values": ts[target].tolist()[-365:],
        }

    for group_col in ("item", "product", "store"):
        if group_col in df.columns and target in df.columns:
            g = df.groupby(group_col)[target].sum().sort_values(ascending=False).head(15)
            result[f"{group_col}_wise_demand"] = {"labels": [str(x) for x in g.index.tolist()], "values": g.values.tolist()}

    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
    if len(numeric_cols) > 1:
        corr = df[numeric_cols].corr().round(3)
        result["correlation_heatmap"] = {
            "columns": corr.columns.tolist(),
            "matrix": corr.values.tolist(),
        }

    box_cols = [c for c in numeric_cols if c != target][:5]
    result["boxplot"] = {c: df[c].dropna().tolist()[:500] for c in box_cols}

    cat_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c]) and c != state.date_col]
    if cat_cols:
        c = cat_cols[0]
        vc = df[c].value_counts().head(15)
        result["countplot"] = {"column": c, "labels": [str(x) for x in vc.index.tolist()], "values": vc.values.tolist()}

    if target in df.columns and len(numeric_cols) > 1:
        other = [c for c in numeric_cols if c != target][0] if len([c for c in numeric_cols if c != target]) else None
        if other:
            sample = df[[other, target]].dropna().sample(min(300, len(df)), random_state=1)
            result["scatter"] = {"x_label": other, "x": sample[other].tolist(), "y": sample[target].tolist()}

    return result


# --------------------------------------------------------------------------
# 9. Prediction (used by REST /predict too)
# --------------------------------------------------------------------------
def get_prediction_options():
    df = state.raw_df
    if df is None:
        sample_path = os.path.join(os.path.dirname(__file__), "data", "sample_demand_data.csv")
        if os.path.exists(sample_path):
            df = pd.read_csv(sample_path)
            state.raw_df = df
            state.dataset_source = "Sample Store-Item Demand Dataset"
            state.date_col = "date"
            state.target_col = "sales"

    if df is None:
        return {
            "stores": [],
            "items": [],
            "min_date": "",
            "max_date": "",
            "default_date": "",
            "default_price": 25.0,
        }

    store_col = next((c for c in ["store", "store_id", "shop", "branch"] if c in df.columns), None)
    item_col = next((c for c in ["item", "product", "item_id", "product_id", "sku"] if c in df.columns), None)
    date_col = state.date_col or "date"

    stores = []
    if store_col:
        raw_stores = df[store_col].dropna().unique().tolist()
        try:
            stores = sorted(raw_stores)
        except Exception:
            stores = raw_stores

    items = []
    if item_col:
        raw_items = df[item_col].dropna().unique().tolist()
        try:
            items = sorted(raw_items)
        except Exception:
            items = raw_items

    min_date = ""
    max_date = ""
    default_date = ""
    if date_col in df.columns:
        parsed = pd.to_datetime(df[date_col].dropna(), errors="coerce").dropna()
        if not parsed.empty:
            min_date = parsed.min().strftime("%Y-%m-%d")
            max_date = parsed.max().strftime("%Y-%m-%d")
            # Suggest a realistic prediction date
            default_date = (parsed.max() + pd.Timedelta(days=1)).strftime("%Y-%m-%d")

    default_price = 25.0
    price_col = next((c for c in ["price", "unit_price", "cost"] if c in df.columns), None)
    if price_col:
        num_prices = pd.to_numeric(df[price_col], errors="coerce").dropna()
        if not num_prices.empty:
            default_price = round(float(num_prices.median()), 2)

    return {
        "stores": stores,
        "items": items,
        "min_date": min_date,
        "max_date": max_date,
        "default_date": default_date,
        "default_price": default_price,
    }


def extract_date_features(target_dt: pd.Timestamp) -> dict:
    return {
        "year": int(target_dt.year),
        "month": int(target_dt.month),
        "day": int(target_dt.day),
        "day_of_week": int(target_dt.dayofweek),
        "week_of_year": int(target_dt.isocalendar().week),
        "quarter": int(target_dt.quarter),
    }


def calculate_historical_demand_features(store, item, target_dt: pd.Timestamp) -> dict:
    df = state.raw_df
    if df is None:
        sample_path = os.path.join(os.path.dirname(__file__), "data", "sample_demand_data.csv")
        if os.path.exists(sample_path):
            df = pd.read_csv(sample_path)
            state.raw_df = df
            state.dataset_source = "Sample Store-Item Demand Dataset"
            state.date_col = "date"
            state.target_col = "sales"

    if df is None:
        raise ValueError("No dataset loaded to calculate historical demand features.")

    date_col = state.date_col or "date"
    target_col = state.target_col or "sales"

    store_col = next((c for c in ["store", "store_id", "shop", "branch"] if c in df.columns), None)
    item_col = next((c for c in ["item", "product", "item_id", "product_id", "sku"] if c in df.columns), None)

    sub_df = df.copy()
    if store_col:
        try:
            val_sample = sub_df[store_col].dropna().iloc[0]
            typed_store = type(val_sample)(store)
            sub_df = sub_df[sub_df[store_col] == typed_store]
        except Exception:
            sub_df = sub_df[sub_df[store_col].astype(str) == str(store)]

    if item_col:
        try:
            val_sample = sub_df[item_col].dropna().iloc[0]
            typed_item = type(val_sample)(item)
            sub_df = sub_df[sub_df[item_col] == typed_item]
        except Exception:
            sub_df = sub_df[sub_df[item_col].astype(str) == str(item)]

    if sub_df.empty:
        raise ValueError("Insufficient historical data for this Store and Item to calculate the required demand features.")

    sub_df[date_col] = pd.to_datetime(sub_df[date_col], errors="coerce")
    # Strictly prior observations before the target date to avoid data leakage
    hist_df = sub_df[sub_df[date_col] < target_dt].sort_values(date_col)

    demand_series = hist_df[target_col].dropna()
    if len(demand_series) == 0:
        raise ValueError("Insufficient historical data for this Store and Item to calculate the required demand features.")

    # lag_1: most recent previous available demand observation
    lag_1 = round(float(demand_series.iloc[-1]), 2)

    # rolling_mean_7: mean demand of previous up to 7 available observations
    rolling_obs = demand_series.iloc[-7:]
    rolling_mean_7 = round(float(rolling_obs.mean()), 2)

    return {
        "lag_1": lag_1,
        "rolling_mean_7": rolling_mean_7,
    }


def predict(model_name: str, input_features: dict):
    model_name = model_name.lower()
    if model_name not in ("ridge", "lasso"):
        raise ValueError("model must be 'ridge' or 'lasso'.")

    pipeline_path = os.path.join(MODEL_DIR, f"{model_name}_pipeline.joblib")
    if model_name in state.models:
        pipe = state.models[model_name]["pipeline"]
    elif os.path.exists(pipeline_path):
        pipe = joblib.load(pipeline_path)
    else:
        raise ValueError("Model has not been trained yet.")

    meta_path = os.path.join(MODEL_DIR, "metadata.json")
    if not os.path.exists(meta_path):
        raise ValueError("Model metadata not found. Please train models first.")

    with open(meta_path) as f:
        meta = json.load(f)
    feature_cols = meta["feature_columns"]

    # Extract user input values
    store_val = input_features.get("store")
    item_val = input_features.get("item") or input_features.get("product")
    date_val = input_features.get("date")
    price_val = input_features.get("price")
    promo_val = input_features.get("promo")

    generated_features = {}

    # Check if high-level input was provided or if historical features must be calculated
    if date_val is not None or "lag_1" not in input_features:
        if store_val is None or str(store_val).strip() == "":
            raise ValueError("Please select a valid Store.")
        if item_val is None or str(item_val).strip() == "":
            raise ValueError("Please select a valid Product / Item.")
        if not date_val or str(date_val).strip() == "":
            raise ValueError("Please select a valid prediction Date.")
        try:
            target_dt = pd.to_datetime(date_val)
        except Exception:
            raise ValueError(f"Invalid date format '{date_val}'.")

        try:
            price_float = float(price_val)
            if price_float < 0:
                raise ValueError("Price must be non-negative.")
        except (ValueError, TypeError):
            raise ValueError("Price must be a valid non-negative number.")

        try:
            promo_int = int(promo_val)
            if promo_int not in (0, 1):
                raise ValueError("Promotion must be 0 (No) or 1 (Yes).")
        except (ValueError, TypeError):
            raise ValueError("Promotion must be 0 (No) or 1 (Yes).")

        date_feats = extract_date_features(target_dt)
        hist_feats = calculate_historical_demand_features(store_val, item_val, target_dt)
        generated_features = {**date_feats, **hist_feats}

        combined_features = {
            **input_features,
            "store": store_val,
            "item": item_val,
            "price": price_float,
            "promo": promo_int,
            **generated_features,
        }
    else:
        combined_features = input_features

    # Build one DataFrame matching exact training feature columns
    row = {}
    for c in feature_cols:
        val = combined_features.get(c)
        if val is not None and val != "":
            try:
                row[c] = float(val) if ("." in str(val) and not isinstance(val, (list, dict))) else int(val)
            except (ValueError, TypeError):
                row[c] = val
        else:
            row[c] = np.nan

    X = pd.DataFrame([row])
    pred = float(pipe.predict(X)[0])
    pred = max(0.0, pred)

    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "model": "Ridge Regression" if model_name == "ridge" else "Lasso Regression",
        "input": row,
        "prediction": round(pred, 2),
        "store": store_val,
        "item": item_val,
        "date": date_val,
        "price": price_val,
        "promo": promo_val,
        "generated_features": generated_features,
    }
    state.predictions_log.append(log_entry)
    return log_entry


# --------------------------------------------------------------------------
# 10. Monitoring
# --------------------------------------------------------------------------
def monitoring_data():
    log = state.predictions_log
    if not log:
        return {
            "num_predictions": 0,
            "avg_prediction": None,
            "min_prediction": None,
            "max_prediction": None,
            "recent_predictions": [],
            "drift_warnings": [],
        }
    preds = [e["prediction"] for e in log]

    drift_warnings = []
    if state.baseline_input_stats:
        recent_inputs = [e["input"] for e in log[-50:]]
        recent_df = pd.DataFrame(recent_inputs)
        for col, stats in state.baseline_input_stats.items():
            if col in recent_df.columns and pd.api.types.is_numeric_dtype(recent_df[col]):
                recent_mean = recent_df[col].astype(float).mean()
                baseline_mean = stats["mean"]
                baseline_std = stats["std"] or 1e-6
                z = abs(recent_mean - baseline_mean) / baseline_std
                if z > 2:
                    drift_warnings.append(
                        f"Possible drift in '{col}': recent mean {recent_mean:.2f} vs training mean {baseline_mean:.2f} (z={z:.2f})"
                    )

    return {
        "num_predictions": len(log),
        "avg_prediction": round(float(np.mean(preds)), 2),
        "min_prediction": round(float(np.min(preds)), 2),
        "max_prediction": round(float(np.max(preds)), 2),
        "recent_predictions": log[-20:][::-1],
        "drift_warnings": drift_warnings,
    }
