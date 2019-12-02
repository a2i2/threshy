import os
import json
from pathlib import Path

import numpy as np
import pandas as pd
import tornado.web

from surround.experiment.gcloud_storage_driver import GCloudStorageDriver
from .optimise import optimise

BUCKET_URI = os.environ["BUCKET_URI"] if "BUCKET_URI" in os.environ else None

class OptimiseHandler(tornado.web.RequestHandler):
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
            selected_cost_index = self.get_cookie("selected_cost_index", 0)
            cost_sessions = self.get_cookie("cost_sessions", None)

            if cost_sessions == "":
                cost_data = {
                    "matrix": [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
                    "portionSize": 1000,
                    "estimateSize": 10000
                }
            else:
                selected_cost_index = int(selected_cost_index)
                cost_sessions = json.loads(cost_sessions)
                cost_data = {
                    "matrix": np.mean([m["matrix"] for m in cost_sessions[selected_cost_index]["costMatrices"]], axis=0),
                    "portionSize": int(cost_sessions[selected_cost_index]["portionSize"]),
                    "estimateSize": int(cost_sessions[selected_cost_index]["estimateSize"])
                }

            path = os.path.join(str(Path.home()), ".surround", ".visualiser", filename)

            # If a bucket is present, pull from that instead
            if BUCKET_URI and not os.path.exists(path):
                os.makedirs(os.path.dirname(path), exist_ok=True)
                driver = GCloudStorageDriver(BUCKET_URI)
                driver.pull(filename, local_path=path, override_ok=True)
                driver.pull(filename + ".gt.npy", local_path=path + ".gt.npy", override_ok=True)

            if not os.path.exists(path):
                self.clear_all_cookies()
                self.set_status(404)
                return

            # Read the uploaded file as CSV
            file_contents = pd.read_csv(path, sep=sep, header=0, engine='python')
            file_contents.columns = [i.strip() for i in file_contents.columns]
            file_contents.fillna(value="UNKNOWN", inplace=True)

            # Calculate matrices and return results
            inputs = {
                "id_column": id_label,
                "ground_truth_column": gt_label,
                "reject_label": reject_label,
                "min": int(min_value),
                "max": int(max_value),
                "cost": cost_data
            }

            if prob_label:
                inputs["probability_column"] = prob_label

            if target_label:
                inputs["target_label"] = target_label

            results = optimise(file_contents, inputs, path + ".gt.npy")

            self.set_status(200)
            self.write(results)
        else:
            self.clear_all_cookies()
            self.set_status(404)
