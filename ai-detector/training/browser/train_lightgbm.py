#!/usr/bin/env python3
"""Human / bot ブラウザ行動データの LightGBM 学習スクリプト（メモ版と同等のロジック）。"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, roc_auc_score, precision_recall_fscore_support
from sklearn.model_selection import GroupKFold

SCRIPT_PATH = Path(__file__).resolve()
PROJECT_ROOT = SCRIPT_PATH.parents[2]

HUMAN_LABEL = 1
BOT_LABEL = 0

# メモ版の特徴量セット（DEFAULT_FEATURE_NAMES と揃える）
FEATURE_NAMES = [
    "mouse_movements_count",
    "mouse_velocity_mean",
    "mouse_velocity_std",
    "mouse_velocity_max",
    "click_avg_interval",
    "click_precision",
    "click_double_rate",
    "keystroke_speed",
    "keystroke_hold",
    "keystroke_interval_var",
    "scroll_speed",
    "scroll_acc",
    "scroll_pause",
    "page_session_duration_ms",
    "page_dwell_time_ms",
    "page_first_interaction_delay_ms",
    "page_form_fill_speed",
    "page_paste_ratio",
    "seq_total_actions",
    "seq_count_mouse_move",
    "seq_count_click",
    "seq_count_keystroke",
    "seq_count_scroll",
    "seq_count_TIMED_SHORT",
    "seq_count_TIMED_LONG",
    "action_type_PAGE_BEFORE_UNLOAD",
    "action_type_PERIODIC_SNAPSHOT",
    "action_type_TIMED_SHORT",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("training/browser/data"),
        help="bot / human サブディレクトリを含むデータディレクトリ",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("training/browser/model"),
        help="モデルやメトリクスの出力ディレクトリ。",
    )
    parser.add_argument("--model-name", type=str, default="lightgbm_model.pkl", help="出力モデルファイル名。")
    parser.add_argument("--random-state", type=int, default=42, help="乱数 seed。")
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="ログレベル。",
    )
    return parser.parse_args()


def load_jsonl_file(path: Path) -> List[Dict[str, Any]]:
    """JSONL を読み込む。"""
    records: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            records.append(json.loads(line))
    return records


def extract_features(record: Dict[str, Any]) -> Dict[str, Any]:
    """メモ版と同じ特徴量を抽出。"""
    features: Dict[str, Any] = {}

    req = record.get("request", {})
    behavioral_data = req.get("behavioral_data", {})
    behavior_sequence = req.get("behavior_sequence", []) or req.get("behavioral_sequence", [])
    context = req.get("context", {})

    mm = behavioral_data.get("mouse_movements", [])
    velocities = [m.get("velocity") for m in mm if m.get("velocity") is not None]
    features["mouse_movements_count"] = float(len(mm))
    features["mouse_velocity_mean"] = float(np.mean(velocities)) if velocities else 0.0
    features["mouse_velocity_std"] = float(np.std(velocities)) if velocities else 0.0
    features["mouse_velocity_max"] = float(np.max(velocities)) if velocities else 0.0

    click = behavioral_data.get("click_patterns", {})
    features["click_avg_interval"] = float(click.get("avg_click_interval", 0.0) or 0.0)
    features["click_precision"] = float(click.get("click_precision", 0.0) or 0.0)
    features["click_double_rate"] = float(click.get("double_click_rate", 0.0) or 0.0)

    ks = behavioral_data.get("keystroke_dynamics", {})
    features["keystroke_speed"] = float(ks.get("typing_speed_cpm", 0.0) or 0.0)
    features["keystroke_hold"] = float(ks.get("key_hold_time_ms", 0.0) or 0.0)
    features["keystroke_interval_var"] = float(ks.get("key_interval_variance", 0.0) or 0.0)

    scroll = behavioral_data.get("scroll_behavior", {})
    features["scroll_speed"] = float(scroll.get("scroll_speed", 0.0) or 0.0)
    features["scroll_acc"] = float(scroll.get("scroll_acceleration", 0.0) or 0.0)
    features["scroll_pause"] = float(scroll.get("pause_frequency", 0.0) or 0.0)

    page = behavioral_data.get("page_interaction", {})
    features["page_session_duration_ms"] = float(page.get("session_duration_ms", 0.0) or 0.0)
    features["page_dwell_time_ms"] = float(page.get("page_dwell_time_ms", 0.0) or 0.0)
    fid = page.get("first_interaction_delay_ms")
    features["page_first_interaction_delay_ms"] = float(fid if fid is not None else 0.0)
    features["page_form_fill_speed"] = float(page.get("form_fill_speed_cpm", 0.0) or 0.0)
    features["page_paste_ratio"] = float(page.get("paste_ratio", 0.0) or 0.0)

    action_counts: Dict[str, int] = {}
    for act in behavior_sequence:
        action = act.get("action")
        if action:
            action_counts[action] = action_counts.get(action, 0) + 1
    features["seq_total_actions"] = float(sum(action_counts.values()))
    for action_name in ["mouse_move", "click", "keystroke", "scroll", "TIMED_SHORT", "TIMED_LONG"]:
        features[f"seq_count_{action_name}"] = float(action_counts.get(action_name, 0))

    features["context_action_type"] = context.get("action_type", "UNKNOWN") or "UNKNOWN"

    return features


def build_dataset(data_dir: Path) -> Tuple[pd.DataFrame, List[int], List[str]]:
    all_features: List[Dict[str, Any]] = []
    labels: List[int] = []
    session_ids: List[str] = []

    for cls, label in [("bot", 0), ("human", 1)]:
        cls_dir = data_dir / cls
        if not cls_dir.exists():
            continue
        for file in cls_dir.glob("*.jsonl"):
            records = load_jsonl_file(file)
            for rec in records:
                feats = extract_features(rec)
                all_features.append(feats)
                labels.append(label)
                session_ids.append(rec.get("session_id", ""))

    df = pd.DataFrame(all_features)
    return df, labels, session_ids


def prepare_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    cat_col = "context_action_type"
    dummies = pd.get_dummies(df[cat_col], prefix="action_type")
    df_numeric = df.drop(columns=[cat_col]).copy()
    df_processed = pd.concat([df_numeric, dummies], axis=1)

    # DEFAULT_FEATURE_NAMES の順番にそろえ、欠損は 0 で埋める
    for name in FEATURE_NAMES:
        if name not in df_processed.columns:
            df_processed[name] = 0.0
    df_processed = df_processed[FEATURE_NAMES]

    feature_names = list(df_processed.columns)
    return df_processed, feature_names


def train_and_evaluate(X: pd.DataFrame, y: List[int], groups: List[str]) -> lgb.LGBMClassifier:
    clf = lgb.LGBMClassifier(
        objective="binary",
        n_estimators=500,
        learning_rate=0.05,
        num_leaves=31,
        max_depth=-1,
        subsample=0.8,
        colsample_bytree=0.8,
        class_weight="balanced",
        random_state=42,
        verbosity=-1,
    )

    n_splits = min(3, len(set(groups)))
    gkf = GroupKFold(n_splits=n_splits if n_splits > 1 else 2)
    accuracies: List[float] = []
    aucs: List[float] = []
    f1s: List[float] = []

    for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train = [y[i] for i in train_idx]
        y_val = [y[i] for i in val_idx]

        clf.fit(X_train, y_train)
        probs = clf.predict_proba(X_val)[:, 1]
        preds = (probs >= 0.5).astype(int)

        acc = accuracy_score(y_val, preds)
        try:
            auc = roc_auc_score(y_val, probs)
        except ValueError:
            auc = float("nan")
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_val, preds, average="binary", zero_division=0
        )

        accuracies.append(acc)
        aucs.append(auc)
        f1s.append(f1)
        logging.info("Fold %d: accuracy=%.4f, AUC=%.4f, F1=%.4f", fold + 1, acc, auc, f1)

    logging.info("Average accuracy: %.4f", float(np.nanmean(accuracies)))
    logging.info("Average AUC:      %.4f", float(np.nanmean(aucs)))
    logging.info("Average F1:       %.4f", float(np.nanmean(f1s)))

    clf.fit(X, y)
    return clf


def save_artifacts(
    model: lgb.LGBMClassifier,
    feature_names: List[str],
    metrics: Dict[str, Any],
    args: argparse.Namespace,
) -> Path:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    artifact_dir = args.output_dir / timestamp
    artifact_dir.mkdir(parents=True, exist_ok=True)

    model_path = artifact_dir / args.model_name
    joblib.dump(model, model_path)

    metadata = {
        "model_format": "pickle",
        "feature_names": feature_names,
        "label_mapping": {"human": HUMAN_LABEL, "bot": BOT_LABEL},
    }
    (artifact_dir / "lightgbm_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    summary = {
        "metrics": metrics,
        "feature_names": feature_names,
        "label_mapping": {"human": HUMAN_LABEL, "bot": BOT_LABEL},
        "artifacts": {
            "model_path": str(model_path),
            "metadata_path": str(artifact_dir / "lightgbm_metadata.json"),
        },
    }
    (artifact_dir / "training_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    logging.info("Artifacts saved to %s", artifact_dir)
    return artifact_dir


def main() -> None:
    args = parse_args()
    if not args.output_dir.is_absolute():
        args.output_dir = PROJECT_ROOT / args.output_dir
    if not args.data_dir.is_absolute():
        args.data_dir = PROJECT_ROOT / args.data_dir

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    df, labels, session_ids = build_dataset(args.data_dir)
    if df.empty:
        raise RuntimeError("No data found to train on")
    X_processed, feature_names = prepare_features(df)

    model = train_and_evaluate(X_processed, labels, session_ids)

    metrics = {"cv_folds": min(3, len(set(session_ids)))}
    artifact_dir = save_artifacts(model, feature_names, metrics, args)
    logging.info("Training finished. Model saved at %s", artifact_dir / args.model_name)


if __name__ == "__main__":
    main()
