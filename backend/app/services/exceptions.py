"""Typed service-layer exceptions.

Services are HTTP-agnostic — they raise these typed errors so routers
(T17) can map them to HTTP status codes without leaking transport
concerns down into business logic.

- :class:`NotFoundError`   → 404 at the router
- :class:`ConflictError`   → 409 at the router (duplicate keys, etc.)
- :class:`ValidationError` → 422/400 at the router (semantic validation
  failures the schema layer can't enforce, e.g. unknown FK code,
  missing FX rate)
"""

from __future__ import annotations


class NotFoundError(Exception):
    """Resource lookup miss (entity by id, FX rate unavailable, ...)."""


class ConflictError(Exception):
    """Unique-constraint or business-rule conflict (duplicate code/email)."""


class ValidationError(Exception):
    """Semantic validation failure beyond Pydantic's schema-level checks."""
