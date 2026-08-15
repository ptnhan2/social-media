"""File-backed store for LangGraph — persists to disk, same interface as InMemoryStore.

Use in dev (no Postgres needed). In prod, swap for PostgresStore (same interface).

Storage format: JSON file with all items, loaded into memory on init,
flushed to disk on every write.
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from typing import Any

from langgraph.store.base import Item


class FileBackedStore:
    """Persistent key-value store backed by a JSON file.

    Implements the same interface as InMemoryStore (put, get, search, delete,
    list_namespaces) so it can be used as a drop-in replacement.
    """

    def __init__(self, file_path: str):
        self._file_path = file_path
        self._lock = threading.Lock()
        self._items: dict[tuple[tuple[str, ...], str], Item] = {}
        self._load()

    def _load(self):
        """Load items from disk."""
        if not os.path.exists(self._file_path):
            return
        try:
            with open(self._file_path, encoding="utf-8") as f:
                data = json.load(f)
            for entry in data.get("items", []):
                ns = tuple(entry["namespace"])
                key = entry["key"]
                item = Item(
                    value=entry["value"],
                    key=key,
                    namespace=ns,
                    created_at=entry.get("created_at", datetime.now(timezone.utc).isoformat()),
                    updated_at=entry.get("updated_at", datetime.now(timezone.utc).isoformat()),
                )
                self._items[(ns, key)] = item
        except (json.JSONDecodeError, KeyError, OSError):
            pass  # Corrupt or missing file — start fresh

    def _flush(self):
        """Persist all items to disk."""
        os.makedirs(os.path.dirname(self._file_path), exist_ok=True)
        data = {
            "items": [
                {
                    "namespace": list(item.namespace),
                    "key": item.key,
                    "value": item.value,
                    "created_at": item.created_at.isoformat() if isinstance(item.created_at, datetime) else str(item.created_at),
                    "updated_at": item.updated_at.isoformat() if isinstance(item.updated_at, datetime) else str(item.updated_at),
                }
                for item in self._items.values()
            ]
        }
        with open(self._file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def put(self, namespace: tuple[str, ...], key: str, value: dict[str, Any],
            index=None, *, ttl=None) -> None:
        with self._lock:
            now = datetime.now(timezone.utc)
            existing = self._items.get((namespace, key))
            item = Item(
                value=value,
                key=key,
                namespace=namespace,
                created_at=existing.created_at if existing else now,
                updated_at=now,
            )
            self._items[(namespace, key)] = item
            self._flush()

    async def aput(self, namespace, key, value, index=None, *, ttl=None) -> None:
        self.put(namespace, key, value, index, ttl=ttl)

    def get(self, namespace: tuple[str, ...], key: str, *, refresh_ttl=None) -> Item | None:
        return self._items.get((namespace, key))

    async def aget(self, namespace, key, *, refresh_ttl=None) -> Item | None:
        return self.get(namespace, key, refresh_ttl=refresh_ttl)

    def search(self, namespace_prefix: tuple[str, ...], /, *, query=None,
               filter=None, limit=10, offset=0, refresh_ttl=None) -> list:
        results = []
        for (ns, key), item in self._items.items():
            if len(ns) >= len(namespace_prefix) and ns[:len(namespace_prefix)] == namespace_prefix:
                if filter:
                    match = all(item.value.get(k) == v for k, v in filter.items())
                    if not match:
                        continue
                results.append(item)
        results.sort(key=lambda x: x.updated_at, reverse=True)
        return results[offset:offset + limit]

    async def asearch(self, namespace_prefix, /, *, query=None, filter=None,
                      limit=10, offset=0, refresh_ttl=None) -> list:
        return self.search(namespace_prefix, query=query, filter=filter,
                           limit=limit, offset=offset, refresh_ttl=refresh_ttl)

    def delete(self, namespace: tuple[str, ...], key: str) -> None:
        with self._lock:
            self._items.pop((namespace, key), None)
            self._flush()

    async def adelete(self, namespace, key) -> None:
        self.delete(namespace, key)

    def list_namespaces(self, *, prefix=None, suffix=None, max_depth=None, limit=100, offset=0) -> list:
        namespaces = set()
        for (ns, _) in self._items.keys():
            if prefix and len(ns) >= len(prefix) and ns[:len(prefix)] != prefix:
                continue
            if max_depth:
                ns = ns[:max_depth]
            namespaces.add(ns)
        result = sorted(namespaces)
        return result[offset:offset + limit]

    async def alist_namespaces(self, *, prefix=None, suffix=None, max_depth=None, limit=100, offset=0) -> list:
        return self.list_namespaces(prefix=prefix, suffix=suffix, max_depth=max_depth,
                                    limit=limit, offset=offset)

    def batch(self, items):
        for item in items:
            if "op" in item and item["op"] == "delete":
                self.delete(item["namespace"], item["key"])
            else:
                self.put(item["namespace"], item["key"], item["value"])

    async def abatch(self, items):
        self.batch(items)
