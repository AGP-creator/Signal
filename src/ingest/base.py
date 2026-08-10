from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class NormalizedSignal:
    id: str
    source: str
    signal_type: str
    title: str
    summary: str
    observed_at: str
    url: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    raw: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "source": self.source,
            "signal_type": self.signal_type,
            "title": self.title,
            "summary": self.summary,
            "observed_at": self.observed_at,
            "url": self.url,
            "company_id": self.company_id,
            "company_name": self.company_name,
            "raw": self.raw,
        }


class SourceAdapter(ABC):
    name: str = "base"

    @abstractmethod
    def fetch(self) -> list[NormalizedSignal]:
        raise NotImplementedError


class StubConnector(SourceAdapter):
    """Phase-2 placeholder for paid databases."""

    def __init__(self, name: str):
        self.name = name

    def fetch(self) -> list[NormalizedSignal]:
        return []
