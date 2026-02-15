from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.session import Base


class PlaceAccessibility(Base):
    __tablename__ = "place_accessibility"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    feature_key = Column(String(60), nullable=False)
