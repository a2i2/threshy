import os
import logging
import tornado.ioloop
import tornado.web

from .dashboard import Dashboard
from .metrics_handler import MetricsHandler
from .upload_handler import UploadHandler
from .cost_handler import CostHandler
from .optimise_handler import OptimiseHandler

class MyStaticFileHandler(tornado.web.StaticFileHandler):
    def set_extra_headers(self, path):
        self.set_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")

class VisualiseWebApp(tornado.web.Application):
    is_closing = False

    def signal_handler(self, signum, frame):
        logging.info('exiting...')
        self.is_closing = True

    def try_exit(self):
        if self.is_closing:
            # clean up here
            tornado.ioloop.IOLoop.instance().stop()
            logging.info('exit success')

    def __init__(self):
        handlers = [
            (r'/', Dashboard, None),
            (r'/(.+\.(js|css))', MyStaticFileHandler, {"path": os.path.dirname(__file__)}),
            (r'/metrics', MetricsHandler, None),
            (r'/cost_matrix', CostHandler, None),
            (r'/optimise', OptimiseHandler, None),
            (r'/upload_csv', UploadHandler, None)
        ]

        super().__init__(handlers)
