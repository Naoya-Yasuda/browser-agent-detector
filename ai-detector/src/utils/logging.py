"""アプリケーション共通のロギング設定。"""

import logging
import sys


def setup_logging(level: int = logging.INFO) -> None:
    """標準的なロギング設定を適用する。"""
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
