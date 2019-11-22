import os
from pathlib import Path

import tornado.web
import pandas as pd
from .visualise_classifier import calculate_classifier_metrics

class MetricsHandler(tornado.web.RequestHandler):
    def get(self):
        filename = self.get_cookie("filename")

        if filename:
            gt_label = self.get_cookie("ground_label", "ground-truth")
            pred_label = self.get_cookie("predict_label", "predict")
            prob_label = self.get_cookie("probability_label", "confidence")
            sep = self.get_cookie("separator", ",")

            path = os.path.join(str(Path.home()), ".surround", ".visualiser", filename)

            if not os.path.exists(path):
                print("Failed to find file in cookie!")
                self.clear_all_cookies()
                self.set_status(404)
                return

            # Read the uploaded file as CSV
            file_contents = pd.read_csv(path, sep=sep, header=0, engine='python')
            file_contents.columns = [i.strip() for i in file_contents.columns]
            file_contents.fillna(value="UNKNOWN", inplace=True)

            if gt_label not in file_contents or pred_label not in file_contents:
                self.set_status(400)
                return

            y_true = file_contents[gt_label]
            y_pred = file_contents[pred_label]
            y_prob = file_contents[prob_label] if prob_label in file_contents else None

            # Generate general metrics and return them
            result = calculate_classifier_metrics(y_true, y_pred, y_prob)

            self.set_status(200)
            self.write(result)
        else:
            self.set_status(404)
