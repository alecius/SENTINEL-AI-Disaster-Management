import os
import numpy as np
import joblib

from PIL import Image
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score, classification_report

DATA_DIR = "data/aiderv2"

CLASSES = ["Earthquake", "Flood", "Fire", "Normal"]


def load_images(folder):
    X = []
    y = []

    for label in CLASSES:
        path = os.path.join(folder, label)

        if not os.path.isdir(path):
            raise FileNotFoundError(f"Missing folder: {path}")

        files = os.listdir(path)
        count = 0

        for filename in files:
            if filename.lower().endswith((".png", ".jpg", ".jpeg")):
                try:
                    img_path = os.path.join(path, filename)

                    img = Image.open(img_path).convert("L")
                    img = img.resize((32, 32))

                    features = np.array(img, dtype=np.float32).flatten() / 255.0

                    X.append(features)
                    y.append(label)

                    count += 1

                    if count % 500 == 0:
                        print(f"{label}: {count} images loaded")

                except Exception as e:
                    print("Skipped:", filename, e)

    return np.array(X), np.array(y)


print("Loading training images...")
X_train, y_train = load_images(os.path.join(DATA_DIR, "Train"))

print("Loading validation images...")
X_val, y_val = load_images(os.path.join(DATA_DIR, "Val"))

print("Loading test images...")
X_test, y_test = load_images(os.path.join(DATA_DIR, "Test"))

print("Training images:", len(X_train))
print("Validation images:", len(X_val))
print("Testing images:", len(X_test))

if len(X_train) == 0 or len(X_test) == 0:
    raise ValueError("Dataset is empty!")

print("Training model...")

model = SGDClassifier(
    loss="log_loss",
    max_iter=1000,
    early_stopping=True,
    random_state=42
)

model.fit(X_train, y_train)

if len(X_val) > 0:
    val_predictions = model.predict(X_val)
    print("Validation accuracy:",
          accuracy_score(y_val, val_predictions))

print("Testing model...")

predictions = model.predict(X_test)

print("Test accuracy:", accuracy_score(y_test, predictions))

print(classification_report(
    y_test,
    predictions,
    zero_division=0
))

os.makedirs("models", exist_ok=True)

joblib.dump(model, "models/image_model.pkl")

print("Image model saved successfully!")
