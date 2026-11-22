"""drama backdrop and accent

Revision ID: b7e2f4c1d9a8
Revises: a1c4d2e9b7f3
Create Date: 2026-11-21 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2f4c1d9a8'
down_revision: Union[str, Sequence[str], None] = 'a1c4d2e9b7f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("dramas", sa.Column("backdrop_path", sa.String(), nullable=True))
    op.add_column("dramas", sa.Column("accent", sa.String(length=7), nullable=True))


def downgrade() -> None:
    op.drop_column("dramas", "accent")
    op.drop_column("dramas", "backdrop_path")
