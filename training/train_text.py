import pandas as pd
import joblib

from pathlib import Path

from sklearn.pipeline import Pipeline

from sklearn.feature_extraction.text import TfidfVectorizer

from sklearn.linear_model import LogisticRegression

from sklearn.model_selection import train_test_split

from sklearn.metrics import classification_report


BASE_DIR = Path(__file__).resolve().parent.parent

DATA = BASE_DIR / "data" / "text_training.csv"

MODEL_DIR = BASE_DIR / "saved_models"

MODEL_DIR.mkdir(exist_ok=True)


df = pd.read_csv(DATA)

X = df["text"]

y = df["label"]


X_train, X_test, y_train, y_test = train_test_split(

    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y

)


model = Pipeline([

    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 2),
        stop_words="english"
    )),

    ("classifier", LogisticRegression(
        max_iter=1000,
        class_weight="balanced"
    ))

])


model.fit(X_train, y_train)


predictions = model.predict(X_test)


print(classification_report(
    y_test,
    predictions,
    zero_division=0
))


joblib.dump(
    model,
    MODEL_DIR / "text_model.pkl"
)


print("Text model trained successfully!")
