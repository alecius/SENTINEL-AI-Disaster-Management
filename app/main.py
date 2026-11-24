from pathlib import Path
from io import BytesIO
from typing import Optional

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException
)

from fastapi.staticfiles import StaticFiles

from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from pydantic import BaseModel, Field

from PIL import Image, UnidentifiedImageError

from app.database import Base, engine, get_db

from app.models import DisasterReport

from app.ml import predict_text, predict_image

from app.recommendations import get_recommendations


BASE_DIR = Path(__file__).resolve().parent.parent


Base.metadata.create_all(bind=engine)


app = FastAPI(

    title="AI Disaster Management System",

    description="Multimodal AI Disaster Detection Platform"

)


app.mount(

    "/static",

    StaticFiles(directory=str(BASE_DIR / "static")),

    name="static"

)


class TextRequest(BaseModel):

    text: str = Field(min_length=5, max_length=3000)

    latitude: Optional[float] = Field(default=None, ge=-90, le=90)

    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


def save_report(db, result, description, latitude=None, longitude=None):

    report = DisasterReport(

        disaster_type=result["disaster_type"],

        severity=result["severity"],

        confidence=result["confidence"],

        source=result["source"],

        description=description,

        latitude=latitude,

        longitude=longitude

    )

    db.add(report)

    db.commit()

    db.refresh(report)

    return report


@app.get("/")

def home():

    return FileResponse(
        BASE_DIR / "static" / "index.html"
    )


@app.get("/api/health")

def health():

    return {
        "status": "Running",
        "project": "AI Disaster Management"
    }


@app.post("/api/predict-text")

def text_prediction(

    request: TextRequest,

    db: Session = Depends(get_db)

):

    result = predict_text(request.text)

    save_report(

        db,

        result,

        request.text,

        request.latitude,

        request.longitude

    )

    result["recommendations"] = get_recommendations(
        result["disaster_type"]
    )

    return result


@app.post("/api/predict-image")
async def image_prediction(

    file: UploadFile = File(...),

    latitude: Optional[float] = Form(default=None),

    longitude: Optional[float] = Form(default=None),

    db: Session = Depends(get_db)

):

    if file.content_type not in [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]:

        raise HTTPException(
            400,
            "Upload JPG, PNG or WEBP."
        )

    raw = await file.read()

    if len(raw) > 8 * 1024 * 1024:

        raise HTTPException(
            413,
            "Image must be smaller than 8 MB."
        )

    try:

        image = Image.open(BytesIO(raw))
        image.verify()

        image = Image.open(BytesIO(raw)).convert("RGB")

    except (UnidentifiedImageError, OSError):

        raise HTTPException(
            400,
            "Invalid image."
        )

    try:

        result = predict_image(image)

    except RuntimeError as error:

        raise HTTPException(
            503,
            str(error)
        )

    # Save report in database

    report = save_report(
        db,
        result,
        f"Uploaded image: {file.filename}",
        latitude,
        longitude
    )

    # Add database report ID

    result["report_id"] = report.id

    result["recommendations"] = get_recommendations(
        result["disaster_type"]
    )

    return result

@app.get("/api/reports")

def get_reports(db: Session = Depends(get_db)):

    reports = db.query(DisasterReport).order_by(

        DisasterReport.id.desc()

    ).limit(100).all()


    return [

        {

            "id": report.id,

            "disaster_type": report.disaster_type,

            "severity": report.severity,

            "confidence": report.confidence,

            "source": report.source,

            "description": report.description,

            "latitude": report.latitude,

            "longitude": report.longitude,

            "created_at": (
                report.created_at.isoformat()
                if report.created_at else None
            )

        }

        for report in reports

    ]



@app.get("/api/stats")
def statistics(db: Session = Depends(get_db)):

    reports = db.query(DisasterReport).all()

    types = {
        "flood": 0,
        "fire": 0,
        "earthquake": 0,
        "landslide": 0,
        "normal": 0
    }

    severities = {
        "Critical": 0,
        "High": 0,
        "Medium": 0,
        "Low": 0,
        "Needs review": 0
    }

    for report in reports:

        disaster_type = report.disaster_type.lower()

        if disaster_type in types:
            types[disaster_type] += 1

        if report.severity in severities:
            severities[report.severity] += 1

    return {
        "total": len(reports),
        "types": types,
        "severities": severities,
        "mapped": sum(
            1 for r in reports
            if r.latitude is not None
            and r.longitude is not None
        )
    }


@app.get("/api/resources")

def resources():

    return [

        {
            "name": "Ambulances",
            "available": 4,
            "total": 6
        },

        {
            "name": "Rescue teams",
            "available": 2,
            "total": 4
        },

        {
            "name": "Relief shelters",
            "available": 3,
            "total": 5
        },

        {
            "name": "Relief kits",
            "available": 120,
            "total": 200
        }

    ]