import io
import os
import json
import requests
from pathlib import Path

import tornado.web
import pandas as pd
from surround.experiment.gcloud_storage_driver import GCloudStorageDriver
from .visualise_classifier import get_results

BUCKET_URI = os.environ["BUCKET_URI"] if "BUCKET_URI" in os.environ else None

class UploadHandler(tornado.web.RequestHandler):
    def post(self):
        url = self.get_body_argument("url", default=None)
        if not url and 'file' not in self.request.files:
            self.set_status(400)
            self.write({
                "errorMessage": "No file included in the request!"
            })
            return

        id_label = self.get_body_argument("idLabel", default="id")
        gt_label = self.get_body_argument("groundTruthLabel", default="ground_truth")
        prob_label = self.get_body_argument("probabilityLabel", default=None)
        target_label = self.get_body_argument("targetLabel", default=None)
        reject_label = self.get_body_argument("rejectLabel", default="REJECT")
        min_value = int(self.get_body_argument("minValue", default=0))
        max_value = int(self.get_body_argument("maxValue", default=1))
        sep = self.get_body_argument("separator")

        problem = int(self.get_body_argument("problem"))

        if problem == 0:
            if not prob_label:
                self.set_status(400)
                self.write({
                "errorMessage": "No probability field specified for binary problem."
                })
                return
            elif not target_label:
                self.set_status(400)
                self.write({
                    "errorMessage": "No target_label field specified for a binary problem."
                })
                return

        # Get the uploaded file as a file-like object
        if url:
            # Download the file from the URL provided by the user
            try:
                uploaded_file = requests.get(url)
                uploaded_file = io.BytesIO(uploaded_file.content)
                filename = os.path.basename(url).replace(' ', '_')
            except Exception:
                self.set_status(400)
                self.write({
                    "errorMessage": "Failed to download from the URL provided!"
                })
                return
        else:
            uploaded_file = self.request.files['file'][0]
            filename = uploaded_file['filename'].replace(' ', '_')
            uploaded_file = io.BytesIO(uploaded_file['body'])

        # Read the uploaded file as CSV
        file_contents = pd.read_csv(uploaded_file, sep=sep, header=0, engine='python')
        file_contents.columns = [i.strip() for i in file_contents.columns]
        file_contents.fillna(value="UNKNOWN", inplace=True)

        if id_label not in file_contents:
            self.set_status(400)
            self.write({
                "errorMessage": "Specified ID label was not found in the file uploaded!"
            })
            return

        if gt_label not in file_contents:
            self.set_status(400)
            self.write({
                "errorMessage": "Specified ground truth label was not found in the file uploaded!"
            })
            return

        if prob_label and prob_label not in file_contents:
            self.set_status(400)
            self.write({
                "errorMessage": "Specified probability label was not found in the file uploaded!"
            })
            return

        if min_value < 0 or max_value < 0 or max_value < min_value:
            self.set_status(400)
            self.write({
                "errorMessage": "Min and max values are invalid!"
            })
            return

        # Save the uploaded file for use later by the user
        export_path = os.path.join(str(Path.home()), ".surround", ".visualiser", filename)
        os.makedirs(os.path.dirname(export_path), exist_ok=True)
        file_contents.to_csv(export_path)

        # Remove any previous cookies
        self.clear_all_cookies()

        # Set the filename to a cookie so it can be used in other requests
        self.set_cookie("id_label", id_label)
        self.set_cookie("ground_label", gt_label)
        self.set_cookie("min_value", str(min_value))
        self.set_cookie("max_value", str(max_value))
        self.set_cookie("separator", sep)
        self.set_cookie("filename", filename)

        self.set_cookie("target_label", target_label if target_label else "")
        self.set_cookie("probability_label", prob_label if prob_label else "")

        # Calculate matrices and return results
        inputs = {
            "id_column": id_label,
            "ground_truth_column": gt_label,
            "reject_label": reject_label,
            "min": min_value,
            "max": max_value,
        }

        if prob_label:
            inputs["probability_column"] = prob_label

        if target_label:
            inputs["target_label"] = target_label

        results = get_results(file_contents, inputs, ground_truth_path=export_path + ".gt.npy")

        # If a bucket is present, write storage to that
        if BUCKET_URI:
            driver = GCloudStorageDriver(BUCKET_URI)
            driver.push(filename, local_path=export_path, override_ok=True)
            driver.push(filename + ".gt.npy", local_path=export_path + ".gt.npy", override_ok=True)

        self.set_cookie("labels", json.dumps(results['labels'], separators=(',', ':')))

        for label in results['labels']:
            self.set_cookie(label + "_threshold", '0.51')

        self.set_status(200)
        self.write(results)
