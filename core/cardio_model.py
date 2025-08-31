import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
import joblib
import os

class CardioModel:
    def __init__(self, model_dir="models"):
        self.scaler = None
        self.models = {
            "Logistic Regression": LogisticRegression(max_iter=1000),
            "Random Forest": RandomForestClassifier(),
            "SVM (small set)": SVC(probability=True),
            "KNN": KNeighborsClassifier()
        }
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.trained = False

    def load_data(self, file_path, sep=';'):
        """Load and preprocess the dataset."""
        df = pd.read_csv(file_path, sep=sep)
        df.columns = df.columns.str.strip()
        if 'id' in df.columns:
            df = df.drop(columns=['id'])
        self.target_col = 'cardio'
        if self.target_col not in df.columns:
            raise ValueError(f"Target column '{self.target_col}' not found")
        self.X = df.drop(columns=[self.target_col])
        self.y = df[self.target_col]
        self.scaler = StandardScaler()
        self.X_scaled = self.scaler.fit_transform(self.X)
        return self.X_scaled, self.y

    def train(self, file_path, save_models=True):
        """Train models and optionally save them."""
        X_scaled, y = self.load_data(file_path)
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        X_train_small = X_train[:5000]
        y_train_small = y_train[:5000]

        print("\n📊 Accuracy Scores:")
        for name, model in self.models.items():
            if name == "SVM (small set)":
                model.fit(X_train_small, y_train_small)
                y_pred = model.predict(X_test)
            else:
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
            acc = accuracy_score(y_test, y_pred)
            print(f"{name:20}: {acc*100:.2f}%")
            if save_models:
                joblib.dump(model, os.path.join(self.model_dir, f"{name.replace(' ', '_')}.pkl"))
        self.trained = True
        joblib.dump(self.scaler, os.path.join(self.model_dir, "scaler.pkl"))

    def predict(self, sample_input, feature_names):
        """Predict on new input data."""
        if not self.trained:
            raise ValueError("Model must be trained before prediction.")
        sample_df = pd.DataFrame([sample_input], columns=feature_names)
        sample_scaled = self.scaler.transform(sample_df)
        results = {}
        for name, model in self.models.items():
            pred = model.predict(sample_scaled)[0]
            if hasattr(model, "predict_proba"):
                confidence = model.predict_proba(sample_scaled)[0][pred]
                results[name] = {"prediction": pred, "status": "Disease" if pred == 1 else "Healthy", "confidence": confidence}
            else:
                results[name] = {"prediction": pred, "status": "Disease" if pred == 1 else "Healthy"}
        return results

    def load_trained_models(self):
        """Load previously trained models."""
        self.scaler = joblib.load(os.path.join(self.model_dir, "scaler.pkl"))
        for name in self.models:
            self.models[name] = joblib.load(os.path.join(self.model_dir, f"{name.replace(' ', '_')}.pkl"))
        self.trained = True