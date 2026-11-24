"""Authentication package."""
from .graph_auth import GraphAuthError, GraphAuthProvider

__all__ = ["GraphAuthProvider", "GraphAuthError"]
