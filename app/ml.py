
import joblib
import numpy as np
import pandas as pd
import json
import tensorflow as tf

from pathlib import Path
from PIL import Image

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression


BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

MODEL_DIR.mkdir(exist_ok=True)

# Model paths
TEXT_MODEL = MODEL_DIR / "text_model.pkl"
CNN_MODEL = MODEL_DIR / "disaster_cnn.keras"
CLASS_NAMES_FILE = MODEL_DIR / "class_names.json"


# Load text model
def get_text_model():

    if TEXT_MODEL.exists():
        return joblib.load(TEXT_MODEL)

    df = pd.read_csv(DATA_DIR / "text_training.csv")

    X = df["text"]
    y = df["label"]

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

    model.fit(X, y)

    joblib.dump(model, TEXT_MODEL)

    return model


# Severity detection
def estimate_severity(text):

    text = text.lower()

    critical = [
        "trapped",
        "missing",
        "collapsed",
        "casualties",
        "buried",
        "swept away"
    ]

    high = [
        "injured",
        "destroyed",
        "evacuate",
        "severe",
        "submerged",
        "spreading rapidly"
    ]

    medium = [
        "flooded",
        "blocked",
        "damage",
        "smoke",
        "rising water",
        "cracks"
    ]

    if any(word in text for word in critical):
        return "Critical"

    elif any(word in text for word in high):
        return "High"

    elif any(word in text for word in medium):
        return "Medium"

    return "Low"


# Text prediction
def predict_text(text):

    model = get_text_model()

    prediction = model.predict([text])[0]

    probabilities = model.predict_proba([text])[0]

    confidence = max(probabilities)

    severity = estimate_severity(text)

    return {

        "disaster_type": str(prediction),

        "severity": severity,

        "confidence": round(float(confidence) * 100, 2),

        "source": "Text"

    }


# Load CNN model
def get_cnn_model():

    if not CNN_MODEL.exists():

        raise RuntimeError(
            "CNN model not found. Train the CNN first."
        )

    return tf.keras.models.load_model(CNN_MODEL)


# Load CNN class names
def get_class_names():

    if not CLASS_NAMES_FILE.exists():

        return ["Earthquake", "Fire", "Flood", "Normal"]

    with open(CLASS_NAMES_FILE, "r") as file:

        return json.load(file)


# CNN image prediction
def predict_image(image):

    model = get_cnn_model()

    class_names = get_class_names()

    # Prepare image
    image = image.convert("RGB")

    image = image.resize((128, 128))

    image_array = np.array(image, dtype=np.float32)

    image_array = np.expand_dims(image_array, axis=0)

    # Predict
    probabilities = model.predict(
        image_array,
        verbose=0
    )[0]

    predicted_index = int(np.argmax(probabilities))

    prediction = class_names[predicted_index]

    confidence = float(probabilities[predicted_index])

    return {

        "disaster_type": str(prediction),

        "severity": "Needs review",

        "confidence": round(confidence * 100, 2),

        "source": "CNN Image"

    }
