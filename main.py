import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import webview
import db
from api import MasteryAPI


def main():
    db.init_db()
    api = MasteryAPI()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(base_dir, 'frontend', 'index.html')

    webview.create_window(
        title='Mastery',
        url=html_path,
        js_api=api,
        width=420,
        height=820,
        min_size=(360, 600),
        background_color='#0d0117',
    )
    webview.start(
        http_server=True,
        storage_path=os.path.join(base_dir, 'data'),
    )


if __name__ == '__main__':
    main()
