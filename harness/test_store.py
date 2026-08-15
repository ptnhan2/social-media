"""Test FileBackedStore persistence + agent creation."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import agent (triggers _seed_memory)
from agent import agent, store

# Check store type
print("Store type:", type(store).__name__)

# Check seeded memories
items = store.search(("harness",))
print(f"Stored items: {len(items)}")
for item in items:
    print(f"  {item.key} (updated: {item.updated_at})")

# Verify persistence — check store.json exists
store_file = os.path.join(os.path.dirname(__file__), "logs", "store.json")
print(f"Store file exists: {os.path.exists(store_file)}")
if os.path.exists(store_file):
    with open(store_file) as f:
        data = json.load(f)
    print(f"Persisted items: {len(data.get('items', []))}")

# Test persistence across instances
print("\n--- Testing persistence across instances ---")
from file_store import FileBackedStore
store2 = FileBackedStore(store_file)
items2 = store2.search(("harness",))
print(f"New instance loaded {len(items2)} items (should match)")
