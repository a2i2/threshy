"""
Main entry-point for the Surround project.
"""

import os
import signal
import logging
import webbrowser
import argparse

import tornado
from surround import has_config
from .visualise.visualise_web_app import VisualiseWebApp

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)

@has_config
def main(config=None):
    parser = argparse.ArgumentParser(
        prog='threshy',
        description="Visualisation tool")

    parser.add_argument(
        '-p',
        '--port',
        type=int,
        help="Port number to bind server to (default: 8080)",
        default=8080)

    args = parser.parse_args()

    LOGGER.info("Starting visualisation web app...")
    app = VisualiseWebApp()
    app.listen(args.port)

    # Ensure CTRL+C will close the app
    signal.signal(signal.SIGINT, app.signal_handler)
    tornado.ioloop.PeriodicCallback(app.try_exit, 100).start()

    LOGGER.info("Server started at: http://localhost:%i", args.port)

    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()
