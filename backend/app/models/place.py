from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func

from app.db.session import Base   # ✅ MESMO Base do projeto (session.py)


class Place(Base):
    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)

    # Partner dono do estabelecimento
    partner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    nome = Column(String(140), nullable=False)
    tipo = Column(String(40), nullable=False)
    cidade = Column(String(60), nullable=False)
    bairro = Column(String(80), nullable=True)
    endereco = Column(String(180), nullable=True)
    cep = Column(String(12), nullable=True)
    descricao = Column(Text, nullable=True)

    cover_image = Column(Text, nullable=True)

    status = Column(
        String(30),
        nullable=False,
        default="DRAFT"  # DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED
    )

    verified = Column(Boolean, nullable=True, default=False)

    verified_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    verified_at = Column(TIMESTAMP(timezone=True), nullable=True)

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=True
    )

    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True
    )
