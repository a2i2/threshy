""" visualise.py

Visualises the output from training a classifier.

Supports both binary and multi class classifiers.

Use cases:
 - Visualising the output from training a model
 - Viewing the output from running batch predictions on a dataset

TODO: Add a flag to set probability thresholds
TODO: Add a flag that describes each aspect of the generated report in human readable terminology

"""

import os
import pandas as pd
import numpy as np
import scipy.stats as stats
from sklearn.metrics import confusion_matrix

def calculate_matches(x, lower, upper):
    not_match = np.less(x, lower)
    match = np.greater_equal(x, upper)
    rejects = ~np.logical_xor(not_match, match)
    return np.stack([not_match, match, rejects])

def apply_thresholds(probabilities, lower, upper):
    temp = calculate_matches(probabilities, lower, upper)
    def value(x):
        return np.where(x == True)[0][0]
    return np.apply_along_axis(value, 0, temp)

def calculate_confusion_matrices(gt, pred):
    result = np.zeros((gt.shape[1],3,3), dtype=np.int)
    for i,(x,y) in enumerate(zip(gt.T,pred.T)):
        matrix = confusion_matrix(x,y)
        if np.shape(matrix) < (3,3):
            matrix = np.c_[matrix, np.zeros(2)]
            matrix = np.r_[matrix, [np.zeros(3)]]
        elif np.shape(matrix) > (3, 3):
            raise ValueError("Matrix should be 3x3, error in input labels")

        # Column order: matches, not match, rejects
        matrix[:,[0,1]] = matrix[:,[1, 0]]
        # Row order: matches, not match, rejects 
        matrix[[0,1], :] = matrix[[1, 0], :]

        result[i] = matrix
    return result

def normalise_probs_in_place(df, inputs, labels):
    if inputs["min"] == 0 and inputs["max"] == 100:
        for label in labels:
            if label == inputs["reject_label"]:
                continue
            if (df[label] < 1).any() and (df[label] >= 0).any():
                return 
            df[label] = df[label] / 100      
    elif inputs["min"] == 0 and inputs["max"] == 1:
        # TODO: Check that the provided constraints are not violated 
        return
    else:
        raise ValueError("Normalisation rule not specified")

def derive_probabilities(df, inputs):
    if "probability_column" in inputs:
        probabilities = pd.DataFrame()
        probabilities[inputs["target_label"]] = df[inputs["probability_column"]]
        probabilities["id"] = df[inputs["id_column"]]
    else:
        labels = list(retrieve_labels(df, inputs))
        labels.insert(0, inputs["id_column"])
        probabilities = df[labels]
        probabilities = probabilities.rename(columns={inputs["id_column"]: "id"})
    return probabilities.drop_duplicates("id")

def retrieve_labels(df, inputs):
    return df[inputs["ground_truth_column"]].str.strip().sort_values().unique()

def check_labels_have_columns(df, labels):
    return len(set(df.columns) & set(labels)) == len(labels)

def prepare_labels(df, inputs):
    labels = retrieve_labels(df, inputs)

    if "target_label" in inputs:
        labels = list(filter(lambda x: x == inputs["target_label"], labels))

    if not check_labels_have_columns(df, labels) and not "probability_column" in inputs:
        raise ValueError("Labels do not have column names for probabilities")   

    return sorted(labels)

def prepare_ground_truth(df, inputs, mapping):
    ids = []
    truth_columns = inputs["ground_truth_column"]

    if not "target_label" in inputs:
        all_labels = []
        for a_id in df[inputs["id_column"]].unique():
            ground_truth_labels = df[df[inputs["id_column"]] == a_id][truth_columns]
            indexes = [mapping[s.strip()] for s in list(ground_truth_labels)]     
            ground_truth = np.zeros(len(mapping), dtype=int)
            ground_truth[indexes] = 1
            ids.append(a_id)
            all_labels.append(ground_truth)
        columns = list(mapping.keys())
        ground_truth = pd.DataFrame(all_labels)
        ground_truth.columns = columns
    else:
        ids = df[inputs["id_column"]].unique()
        ground_truth = pd.DataFrame()
        ground_truth[inputs["target_label"]] = (df[truth_columns] == inputs["target_label"]) * 1
    ground_truth["id"] = ids    
    return ground_truth

def get_objective(probabilities, ground_truth, lower_thresholds, upper_thresholds):
    """
    returns: (all confusion matrices, thresholds) 
    """
    thres = apply_thresholds(probabilities, lower_thresholds, upper_thresholds)  
    all_results = calculate_confusion_matrices(ground_truth, thres)
    return all_results, thres

def summarise_results(all_results):
    """
    returns Summary array of true match, 
    false match, missed match, and rejects, 
    """
    return np.array([all_results[:,0][:,0].sum(),
            all_results[:,1][:,0].sum(),
            all_results[:,0][:,1].sum(),
            all_results[:,:,2].sum()])

def retrieve_ground_truth(df, inputs, labels, mapping, path=None):
    if path and not os.path.exists(path):
        ground_truth = prepare_ground_truth(df, inputs, mapping)
        np_ground_truth = ground_truth[labels].to_numpy()
        np.save(path, np_ground_truth)
    elif path:
        np_ground_truth = np.load(path)
    else:
        ground_truth = prepare_ground_truth(df, inputs, mapping)
        np_ground_truth = ground_truth[labels].to_numpy()

    return np_ground_truth

def get_results(df, inputs, ground_truth_path=None):
    labels = prepare_labels(df, inputs)

    normalise_probs_in_place(df, inputs, labels)
    probabilities = derive_probabilities(df, inputs)

    mapping = {label: i for i, label in enumerate(labels)}
    np_ground_truth = retrieve_ground_truth(df, inputs, labels, mapping, ground_truth_path)
    np_probs = probabilities[labels].to_numpy()

    if 'thresholds' in inputs:
        new_threshold = np.asarray(inputs['thresholds'], dtype=np.double)
    else:
        new_threshold = np.full(len(labels), 0, dtype=np.double)
    
    all_matrices, thresholded = get_objective(np_probs, np_ground_truth, new_threshold, new_threshold)
    results = summarise_results(all_matrices)

    return {
        "labels": labels,
        "matrices": all_matrices.tolist(),
        "summary": results.tolist()
    }

if __name__ == "__main__":
    # df = pd.read_csv("../../input/mailguard-labeled-results.csv")
    df = pd.read_csv("../../input/predictions-email-classifier-percept_20191014-161825.csv")

    inputs = {
        "id_column": "email_id",
        "ground_truth_column": "work_type",
        "reject_label": "REJECT",
        "min": 0,
        "max": 100,
        
        # "probability_column" : "probabilities",  # Optional???
        # "target_label" : "spam",                 # Optional???
    }

    print(get_results(df, inputs))
