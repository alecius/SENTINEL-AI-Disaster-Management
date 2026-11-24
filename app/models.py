from sqlalchemy import Column

from sqlalchemy import Integer, String, Float, DateTime, Text

from sqlalchemy.sql import func

from app.database import Base


class DisasterReport(Base):

    __tablename__ = "disaster_reports"


    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    disaster_type = Column(String(50))


    severity = Column(String(30))


    confidence = Column(Float)


    source = Column(String(20))


    description = Column(Text)


    latitude = Column(Float, nullable=True)


    longitude = Column(Float, nullable=True)


    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )