import os
import json
from pathlib import Path

import pandas as pd
import tornado.web

from .optimise import optimise

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
            cost_data = self.get_cookie("cost_matrix", {
                "matrix": [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
                "portionSize": 1000,
                "estimateSize": 10000
            })

            if cost_data == "":
                cost_data = {
                    "matrix": [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
                    "portionSize": 1000,
                    "estimateSize": 10000
                }

            path = os.path.join(str(Path.home()), ".surround", ".visualiser", filename)

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
                "cost": cost_data if isinstance(cost_data, dict) else json.loads(cost_data)
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
