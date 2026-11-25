import sys
from pathlib import Path

# Add parent directory to sys.path so 'email_triage' package is always resolvable
parent_dir = str(Path(__file__).resolve().parent.parent)
current_dir = str(Path(__file__).resolve().parent)
for p in (parent_dir, current_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

from email_triage.api.routes import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8085, reload=True)
