import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import webview
import db
from api import MasteryAPI

_IS_ANDROID = hasattr(sys, 'getandroidapilevel')


def main():
    db.init_db()
    api = MasteryAPI()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(base_dir, 'frontend', 'index.html')

    window_kwargs = dict(
        title='Mastery',
        url=html_path,
        js_api=api,
        background_color='#0d0117',
    )
    if not _IS_ANDROID:
        window_kwargs.update(width=420, height=820, min_size=(360, 600))

    webview.create_window(**window_kwargs)

    start_kwargs = dict(http_server=True)
    if not _IS_ANDROID:
        start_kwargs['storage_path'] = os.path.join(base_dir, 'data')

    webview.start(**start_kwargs)


if __name__ == '__main__':
    main()
