import json
import joblib
from datetime import datetime

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, cross_validate, train_test_split
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, OrdinalEncoder, StandardScaler
from xgboost import XGBClassifier

try:
    import shap
except Exception:
    shap = None


def engineer_features(df):
    df_new = df.copy()

    df_new["coastal_vulnerability"] = np.where(
        df_new["coast_km"] < 50,
        3.0,
        np.where(df_new["coast_km"] < 200, 1.8, np.where(df_new["coast_km"] < 500, 1.2, 1.0)),
    )
    df_new["urban_risk_score"] = (df_new["pop_density"] * df_new["severity"]) / 10000
    df_new["elevation_risk"] = np.where(
        df_new["elevation_m"] < 30,
        1.8,
        np.where(df_new["elevation_m"] < 100, 1.3, np.where(df_new["elevation_m"] > 500, 1.4, 1.0)),
    )
    df_new["is_monsoon"] = df_new["month"].isin([6, 7, 8, 9]).astype(int)
    df_new["seismic_risk"] = df_new["seismic_zone"] / 5.0
    df_new["rainfall_risk"] = np.where(
        df_new["annual_rainfall_mm"] > 2500,
        1.5,
        np.where(df_new["annual_rainfall_mm"] < 500, 1.4, 1.0),
    )
    df_new["is_cyclone_season"] = df_new["month"].isin([4, 5, 10, 11]).astype(int)

    return df_new


def build_preprocessor(numerical_features, categorical_features, ordinal_features):
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numerical_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("ord", OrdinalEncoder(), ordinal_features),
        ],
        remainder="passthrough",
    )


def build_baseline_pipeline(preprocessor):
    return ImbPipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ]
    )


def get_metric_bundle(y_true, y_pred, y_pred_proba, class_names):
    report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True, zero_division=0)
    conf_matrix = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names)))).tolist()
    roc_auc = roc_auc_score(y_true, y_pred_proba, multi_class="ovr", average="macro")

    per_class = {}
    for class_name in class_names:
        class_metrics = report[class_name]
        per_class[class_name] = {
            "precision": float(class_metrics["precision"]),
            "recall": float(class_metrics["recall"]),
            "f1": float(class_metrics["f1-score"]),
            "support": int(class_metrics["support"]),
        }

    return {
        "accuracy": float(round(accuracy_score(y_true, y_pred), 4)),
        "f1_weighted": float(round(f1_score(y_true, y_pred, average="weighted"), 4)),
        "f1_macro": float(round(f1_score(y_true, y_pred, average="macro"), 4)),
        "roc_auc_macro": float(round(roc_auc, 4)),
        "class_report": per_class,
        "confusion_matrix": conf_matrix,
        "test_samples": int(len(y_true)),
    }


def get_cross_validation_summary(model, X_train, y_train, cv):
    scoring = {
        "accuracy": "accuracy",
        "f1_weighted": "f1_weighted",
        "f1_macro": "f1_macro",
        "recall_macro": "recall_macro",
    }
    scores = cross_validate(model, X_train, y_train, cv=cv, scoring=scoring, n_jobs=1)
    return {
        metric: {
            "mean": float(round(np.mean(scores[f"test_{metric}"]), 4)),
            "std": float(round(np.std(scores[f"test_{metric}"]), 4)),
            "folds": [float(round(value, 4)) for value in scores[f"test_{metric}"]],
        }
        for metric in scoring
    }


def get_feature_importance(best_model, X_train, numerical_features, categorical_features, ordinal_features, pass_through_features):
    fitted_preprocessor = best_model.named_steps["preprocessor"]
    fitted_rf = best_model.named_steps["classifier"].named_estimators_["rf"]

    num_names = numerical_features
    cat_names = fitted_preprocessor.named_transformers_["cat"].get_feature_names_out(categorical_features).tolist()
    ord_names = ordinal_features
    all_feature_names = num_names + cat_names + ord_names + pass_through_features

    if shap is not None:
        X_train_transformed = fitted_preprocessor.transform(X_train)
        sample_size = min(100, X_train_transformed.shape[0])
        background_idx = np.random.choice(X_train_transformed.shape[0], sample_size, replace=False)
        background_data = X_train_transformed[background_idx]

        explainer = shap.TreeExplainer(fitted_rf)
        shap_values = explainer.shap_values(background_data)

        if isinstance(shap_values, list):
            mean_abs_shap = np.mean([np.abs(values).mean(axis=0) for values in shap_values], axis=0)
        elif len(shap_values.shape) > 2:
            mean_abs_shap = np.abs(shap_values).mean(axis=0).mean(axis=-1)
        else:
            mean_abs_shap = np.abs(shap_values).mean(axis=0)
    else:
        mean_abs_shap = fitted_rf.feature_importances_

    feature_importance_dict = {
        name: float(importance) for name, importance in zip(all_feature_names, mean_abs_shap)
    }
    return dict(sorted(feature_importance_dict.items(), key=lambda item: item[1], reverse=True)), all_feature_names


def train_model():
    print("Loading dataset...")
    df = pd.read_csv("backend/ml_model/india_disaster_dataset.csv")
    df = engineer_features(df)

    target_col = "risk_level"

    # Exclude `death_log` from training to reduce direct leakage from outcome severity.
    numerical_features = [
        "severity",
        "pop_density",
        "elevation_m",
        "coast_km",
        "annual_rainfall_mm",
        "coastal_vulnerability",
        "urban_risk_score",
        "elevation_risk",
        "seismic_risk",
        "rainfall_risk",
    ]
    categorical_features = ["disaster_type", "season", "city"]
    ordinal_features = ["seismic_zone"]
    pass_through_features = ["is_monsoon", "is_cyclone_season"]

    feature_cols = numerical_features + categorical_features + ordinal_features + pass_through_features
    X = df[feature_cols]
    y = df[target_col]

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    joblib.dump(label_encoder, "backend/ml_model/label_encoder.pkl")
    class_names = label_encoder.classes_

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, stratify=y_encoded, random_state=42
    )

    preprocessor = build_preprocessor(numerical_features, categorical_features, ordinal_features)
    baseline_preprocessor = build_preprocessor(numerical_features, categorical_features, ordinal_features)

    gb = GradientBoostingClassifier(n_estimators=100, learning_rate=0.05, random_state=42)
    rf = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)
    xgb = XGBClassifier(n_estimators=100, random_state=42, eval_metric="mlogloss")

    voting_clf = VotingClassifier(
        estimators=[("gb", gb), ("rf", rf), ("xgb", xgb)],
        voting="soft",
    )

    min_class_count = pd.Series(y_train).value_counts().min()
    k_neighbors = min(5, min_class_count - 1)
    smote_transformer = SMOTE(k_neighbors=k_neighbors, random_state=42) if k_neighbors >= 1 else "passthrough"

    pipeline = ImbPipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("smote", smote_transformer),
            ("classifier", voting_clf),
        ]
    )

    param_distributions = {
        "classifier__gb__n_estimators": [100, 200],
        "classifier__rf__n_estimators": [100, 200],
        "classifier__xgb__n_estimators": [100, 200],
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print("Training model with RandomizedSearchCV...")
    search = RandomizedSearchCV(
        pipeline,
        param_distributions,
        n_iter=5,
        cv=cv,
        scoring="recall_macro",
        n_jobs=1,
        random_state=42,
        return_train_score=False,
    )
    search.fit(X_train, y_train)
    best_model = search.best_estimator_

    print("Evaluating best ensemble...")
    y_pred = best_model.predict(X_test)
    y_pred_proba = best_model.predict_proba(X_test)
    ensemble_metrics = get_metric_bundle(y_test, y_pred, y_pred_proba, class_names)

    print("Evaluating baselines...")
    baseline_model = build_baseline_pipeline(baseline_preprocessor)
    baseline_model.fit(X_train, y_train)
    baseline_pred = baseline_model.predict(X_test)
    baseline_pred_proba = baseline_model.predict_proba(X_test)
    baseline_metrics = get_metric_bundle(y_test, baseline_pred, baseline_pred_proba, class_names)

    dummy_model = DummyClassifier(strategy="most_frequent")
    dummy_model.fit(X_train, y_train)
    dummy_pred = dummy_model.predict(X_test)
    dummy_pred_proba = np.eye(len(class_names))[dummy_pred]
    dummy_metrics = get_metric_bundle(y_test, dummy_pred, dummy_pred_proba, class_names)

    print("Running cross-validation on best model...")
    cross_validation = get_cross_validation_summary(best_model, X_train, y_train, cv)

    print("Calculating feature importances...")
    feature_importance_dict, all_feature_names = get_feature_importance(
        best_model,
        X_train,
        numerical_features,
        categorical_features,
        ordinal_features,
        pass_through_features,
    )

    print("Saving artifacts...")
    joblib.dump(best_model, "backend/ml_model/disaster_model.pkl")

    with open("backend/ml_model/feature_importance.json", "w") as file:
        json.dump(feature_importance_dict, file, indent=4)

    metrics = {
        "accuracy": ensemble_metrics["accuracy"],
        "f1_weighted": ensemble_metrics["f1_weighted"],
        "f1_macro": ensemble_metrics["f1_macro"],
        "roc_auc_macro": ensemble_metrics["roc_auc_macro"],
        "training_samples": int(len(X_train)),
        "test_samples": ensemble_metrics["test_samples"],
        "trained_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "model_type": "VotingClassifier (GradientBoosting + RandomForest + XGBoost)",
        "data_sources": [
            "EM-DAT India 2000-2024",
            "USGS Earthquake Catalog",
            "NDMA Historical Records",
        ],
        "features_used": len(all_feature_names),
        "class_report": ensemble_metrics["class_report"],
        "confusion_matrix": ensemble_metrics["confusion_matrix"],
        "cross_validation": cross_validation,
        "search_best_params": search.best_params_,
        "search_best_recall_macro": float(round(search.best_score_, 4)),
        "baseline_metrics": {
            "logistic_regression": {
                "accuracy": baseline_metrics["accuracy"],
                "f1_weighted": baseline_metrics["f1_weighted"],
                "f1_macro": baseline_metrics["f1_macro"],
                "roc_auc_macro": baseline_metrics["roc_auc_macro"],
            },
            "most_frequent_dummy": {
                "accuracy": dummy_metrics["accuracy"],
                "f1_weighted": dummy_metrics["f1_weighted"],
                "f1_macro": dummy_metrics["f1_macro"],
                "roc_auc_macro": dummy_metrics["roc_auc_macro"],
            },
        },
        "model_limitations": [
            "Risk labels are partially heuristic and derived from historical impact thresholds.",
            "The model estimates relative risk for decision support and should not be treated as a real-world disaster forecasting system.",
            "City coverage and geospatial mapping are limited to the curated CITY_FEATURES dataset.",
        ],
        "leakage_controls": [
            "Removed `death_log` from training features because it is too close to the target construction.",
            "Kept engineered environmental and seasonal features while avoiding direct target columns such as affected population and deaths.",
        ],
    }

    with open("backend/ml_model/model_metrics.json", "w") as file:
        json.dump(metrics, file, indent=4)

    print("Training complete. Artifacts saved to backend/ml_model/.")


if __name__ == "__main__":
    train_model()
