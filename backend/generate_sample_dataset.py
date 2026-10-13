"""
Generates a synthetic but realistic Store-Item Demand dataset for the
Product Demand Forecasting project.

Columns: date, store, item, price, promo, sales

Run:
    python generate_sample_dataset.py
Produces:
    data/sample_demand_data.csv
"""
import numpy as np
import pandas as pd
import os

np.random.seed(42)

N_STORES = 5
N_ITEMS = 8
START_DATE = "2021-01-01"
END_DATE = "2023-12-31"

dates = pd.date_range(START_DATE, END_DATE, freq="D")

rows = []
for store in range(1, N_STORES + 1):
    for item in range(1, N_ITEMS + 1):
        base_level = np.random.uniform(20, 80)
        trend = np.random.uniform(-0.01, 0.02)
        weekly_amp = np.random.uniform(5, 15)
        yearly_amp = np.random.uniform(5, 20)
        price = round(np.random.uniform(5, 50), 2)

        for i, d in enumerate(dates):
            dow = d.dayofweek
            doy = d.dayofyear

            weekly_effect = weekly_amp * (1.3 if dow in (5, 6) else 1.0)
            yearly_effect = yearly_amp * np.sin(2 * np.pi * doy / 365.0)
            trend_effect = base_level + trend * i
            promo = 1 if np.random.rand() < 0.08 else 0
            promo_effect = 15 * promo

            noise = np.random.normal(0, 5)

            demand = max(
                0,
                trend_effect + weekly_effect + yearly_effect + promo_effect + noise,
            )

            rows.append(
                {
                    "date": d.strftime("%Y-%m-%d"),
                    "store": store,
                    "item": item,
                    "price": price + np.random.normal(0, 0.5),
                    "promo": promo,
                    "sales": round(demand, 1),
                }
            )

df = pd.DataFrame(rows)

# introduce a small amount of missing values and duplicates to make
# preprocessing meaningful for the project
missing_idx = df.sample(frac=0.01, random_state=1).index
df.loc[missing_idx, "price"] = np.nan

dup_rows = df.sample(frac=0.002, random_state=2)
df = pd.concat([df, dup_rows], ignore_index=True)

os.makedirs("data", exist_ok=True)
out_path = os.path.join("data", "sample_demand_data.csv")
df.to_csv(out_path, index=False)
print(f"Saved {len(df)} rows to {out_path}")
