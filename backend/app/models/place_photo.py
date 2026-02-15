from sqlalchemy import Column, Integer, Text, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func

from app.db.session import Base


class PlacePhoto(Base):
    __tablename__ = "place_photos"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)

    url = Column(Text, nullable=False)
    is_cover = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
