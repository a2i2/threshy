import os
import tornado.web

class Dashboard(tornado.web.RequestHandler):
    def get(self):
        with open(os.path.join(os.path.dirname(__file__), "html", "visualise_web_app.html"), 'rb') as f:
            self.write(f.read())
