import io
import os
from pathlib import Path

import tornado.web
import pandas as pd
from .visualise_classifier import calculate_classifier_metrics

class UploadHandler(tornado.web.RequestHandler):
    def post(self):
        if 'file' not in self.request.files:
            self.set_status(400)
            self.write({
                "errorMessage": "No file included in the request!"
            })
            return

        gt_label = self.get_body_argument("groundTruthLabel", default="ground-truth")
        pred_label = self.get_body_argument("predictLabel", default="predict")
        prob_label = self.get_body_argument("probabilityLabel", default="confidence")
        sep = self.get_body_argument("separator")

        # Get the uploaded file as a file-like object
        uploaded_file = self.request.files['file'][0]
        filename = uploaded_file['filename'].replace(' ', '_')
        uploaded_file = io.BytesIO(uploaded_file['body'])

        # Read the uploaded file as CSV
        file_contents = pd.read_csv(uploaded_file, sep=sep, header=0, engine='python')
        file_contents.columns = [i.strip() for i in file_contents.columns]
        file_contents.fillna(value="UNKNOWN", inplace=True)

        if gt_label not in file_contents:
            self.set_status(400)
            self.write({
                "errorMessage": "Specified ground truth label was not found in the file uploaded!"
            })
            return

        if pred_label not in file_contents:
            self.set_status(400)
            self.write({
                "errorMessage": "Specified prediction label was not found in the file uploaded!"
            })
            return

        if prob_label != "confidence" and prob_label not in file_contents:
            self.set_status(400)
            self.write({
                "errorMessage": "Specified probability label was not found in the file uploaded!"
            })
            return

        y_true = file_contents[gt_label]
        y_pred = file_contents[pred_label]
        y_prob = file_contents[prob_label] if prob_label in file_contents else None

        # Save the uploaded file for use later by the user
        export_path = os.path.join(str(Path.home()), ".surround", ".visualiser", filename)
        os.makedirs(os.path.dirname(export_path), exist_ok=True)
        file_contents.to_csv(export_path)

        # Set the filename to a cookie so it can be used in other requests
        self.set_cookie('ground_label', gt_label)
        self.set_cookie("predict_label", pred_label)
        self.set_cookie("probability_label", prob_label)
        self.set_cookie("separator", sep)
        self.set_cookie('filename', filename)

        # Generate general metrics and return them
        result = calculate_classifier_metrics(y_true, y_pred, y_prob)

        self.write(result)
