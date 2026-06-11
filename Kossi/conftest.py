import sys
import os
# Ensure repository root is on sys.path for pytest collection
ROOT = os.path.dirname(__file__)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
