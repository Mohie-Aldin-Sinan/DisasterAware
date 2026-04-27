from sqlmodel import Field, SQLModel
from datetime import datetime
from typing import Optional
from datetime import date as DateType

class DisasterEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    city: str = Field(index=True)
    state: str = Field(default="")
    date: DateType = Field(index=True)
    disaster_type: str = Field(index=True)
    severity: int
    risk_level: str
    affected_population: int = Field(default=0)
    total_deaths: int = Field(default=0)
    lat: float
    lon: float
    description: str = Field(default="")
    data_source: str = Field(default="ndma")
    source_url: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)
