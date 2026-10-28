import os
import tempfile

os.environ["WEALTHLAB_DATA_DIR"] = tempfile.mkdtemp(prefix="wealthlab-tests-")
