"""deck direction and reason

Revision ID: a1c4d2e9b7f3
Revises: f3875e8087fd
Create Date: 2026-11-21 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'a1c4d2e9b7f3'
down_revision: Union[str, Sequence[str], None] = 'f3875e8087fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("dramas", sa.Column("reason", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("direction", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("direction_description", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("direction_embedding", Vector(1024), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "direction_embedding")
    op.drop_column("users", "direction_description")
    op.drop_column("users", "direction")
    op.drop_column("dramas", "reason")
