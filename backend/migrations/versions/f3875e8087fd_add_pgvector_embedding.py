"""add pgvector embedding

Revision ID: f3875e8087fd
Revises: eb50ab7ece42
Create Date: 2026-11-21 16:53:51.018640

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'f3875e8087fd'
down_revision: Union[str, Sequence[str], None] = 'eb50ab7ece42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.add_column("dramas", sa.Column("embedding", Vector(1024), nullable=True))

def downgrade() -> None:
    op.drop_column("dramas", "embedding")