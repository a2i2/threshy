import os
import json
from pathlib import Path

import tornado.web
import pandas as pd
from surround.experiment.gcloud_storage_driver import GCloudStorageDriver
from .visualise_classifier import get_results

BUCKET_URI = os.environ["BUCKET_URI"] if "BUCKET_URI" in os.environ else None

class MetricsHandler(tornado.web.RequestHandler):
    def get(self):
        filename = self.get_cookie("filename")

        if filename:
            id_label = self.get_cookie("id_label", "id")
            gt_label = self.get_cookie("ground_label", "ground_truth")
            reject_label = self.get_cookie("reject_label", "REJECT")
            target_label = self.get_cookie("target_label", None)
            prob_label = self.get_cookie("probability_label", None)
            min_value = self.get_cookie("min_value", 0)
            max_value = self.get_cookie("max_value", 1)
            sep = self.get_cookie("separator", ",")

            labels = self.get_cookie("labels", "[]")
            labels = json.loads(labels)

            thresholds = []
            for label in labels:
                thresh = self.get_cookie(label + "_threshold", None)

                if thresh:
                    thresholds.append(float(thresh))

            path = os.path.join(str(Path.home()), ".surround", ".visualiser", filename)

            # If a bucket is present, pull from that instead
            if BUCKET_URI and not os.path.exists(path):
                os.makedirs(os.path.dirname(path), exist_ok=True)
                driver = GCloudStorageDriver(BUCKET_URI)
                driver.pull(filename, local_path=path, override_ok=True)
                driver.pull(filename + ".gt.npy", local_path=path + ".gt.npy", override_ok=True)

            if not os.path.exists(path):
                print("Failed to find file in cookie!")
                self.clear_all_cookies()
                self.set_status(404)
                return

            # Read the uploaded file as CSV
            file_contents = pd.read_csv(path, sep=sep, header=0, engine='python')
            file_contents.columns = [i.strip() for i in file_contents.columns]
            file_contents.fillna(value="UNKNOWN", inplace=True)

            if gt_label not in file_contents:
                self.set_status(400)
                return

            # Calculate matrices and return results
            inputs = {
                "id_column": id_label,
                "ground_truth_column": gt_label,
                "reject_label": reject_label,
                "min": int(min_value),
                "max": int(max_value),
                "thresholds": thresholds
            }

            if prob_label:
                inputs["probability_column"] = prob_label

            if target_label:
                inputs["target_label"] = target_label

            self.set_status(200)
            self.write(get_results(file_contents, inputs, path + ".gt.npy"))
        else:
            self.set_status(404)
