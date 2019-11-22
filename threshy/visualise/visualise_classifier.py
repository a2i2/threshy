""" visualise.py

Visualises the output from training a classifier.

Supports both binary and multi class classifiers.

Use cases:
 - Visualising the output from training a model
 - Viewing the output from running batch predictions on a dataset

TODO: Add a flag to set probability thresholds
TODO: Add a flag that describes each aspect of the generated report in human readable terminology

"""

import numpy as np

def safe_div(a, b):
    return a / b if b else 0

def classification_report(y_true, y_pred, classes):
    results = {}

    for name in classes:
        tp = len([(yt, yp) for yt, yp in zip(y_true, y_pred) if yt == yp and yt == name])
        fp = len([(yt, yp) for yt, yp in zip(y_true, y_pred) if yt != yp and yp == name])
        fn = len([(yt, yp) for yt, yp in zip(y_true, y_pred) if yt != yp and yt == name])

        precision = safe_div(tp, (tp + fp))
        recall = safe_div(tp, tp + fn)
        f1_score = safe_div(2 * tp, 2 * tp + fp + fn)
        support = len([p for p in y_true if p == name])
        accuracy = safe_div(tp, fp + fn + tp)

        results[name] = {
            "precision": precision,
            "recall": recall,
            "f1-score": f1_score,
            "support": support,
            "accuracy": accuracy
        }

    total_tp_plus_tn = len([(yt, yp) for yt, yp in zip(y_true, y_pred) if yt == yp])
    results["accuracy"] = safe_div(total_tp_plus_tn, len(y_true))

    results["macro avg"] = {
        "precision": np.mean([results[name]["precision"] for name in classes]),
        "recall": np.mean([results[name]["recall"] for name in classes]),
        "f1-score": np.mean([results[name]["f1-score"] for name in classes]),
        "support": len(y_true),
    }

    weights = [results[name]["support"] for name in classes]

    results["weighted avg"] = {
        "precision": np.average([results[name]["precision"] for name in classes], weights=weights),
        "recall": np.average([results[name]["recall"] for name in classes], weights=weights),
        "f1-score": np.average([results[name]["f1-score"] for name in classes], weights=weights),
        "support": len(y_true),
    }

    return results

def calculate_confusion_matrix(y_true, y_pred, classes):
    result = np.empty([len(classes), len(classes)], dtype=np.int)
    pairs = list(zip(y_true, y_pred))

    for i, true_label in enumerate(classes):
        for j, pred_label in enumerate(classes):
            result[i][j] = pairs.count((true_label, pred_label))

    return result

def calculate_cohen_kappa(confusion_matrix):
    n_classes = confusion_matrix.shape[0]
    sum0 = np.sum(confusion_matrix, axis=0)
    sum1 = np.sum(confusion_matrix, axis=1)
    expected = safe_div(np.outer(sum0, sum1), np.sum(sum0))

    w_mat = np.ones([n_classes, n_classes], dtype=np.int)

    # pylint: disable=unsupported-assignment-operation
    w_mat.flat[:: n_classes + 1] = 0

    k = safe_div(np.sum(w_mat * confusion_matrix), np.sum(w_mat * expected))
    return 1 - k

def calculate_classifier_metrics(y_true, y_pred, y_prob):
    """
    Calculate the metrics used for the classifier visualiser.

    :param y_true: ground truth values
    :type y_true: iterable
    :param y_pred: predicted values
    :type y_pred: iterable
    :param y_prop: probability values
    :type y_prop: iterable
    :return: report, confusion matrix, accuracy, cohen kappa, classes
    :rtype: dict
    """

    classes = list(set(y_true).union(set(y_pred)))

    # Ensure all values are strings
    classes = [str(c) for c in classes]
    y_true = [str(y) for y in y_true]
    y_pred = [str(y) for y in y_pred]

    report_dict = classification_report(y_true, y_pred, classes)
    accuracy = report_dict["accuracy"]

    # Generate a sorted class list and confusion matrix (sorted by popular class)
    if isinstance(y_true, list):
        y_true_list = y_true
    else:
        y_true_list = y_true.tolist()

    classes = sorted(classes, key=y_true_list.count, reverse=True)
    conf_matrix = calculate_confusion_matrix(y_true, y_pred, classes)
    normal_conf_matrix = conf_matrix.astype('float') / conf_matrix.sum(axis=1)[:, np.newaxis]
    normal_conf_matrix = np.nan_to_num(normal_conf_matrix)

    cohen_kappa = calculate_cohen_kappa(conf_matrix)

    output = {
        'report': report_dict,
        'confusion_matrix': conf_matrix.tolist(),
        'normalized_confusion_matrix': normal_conf_matrix.tolist(),
        'accuracy_score': accuracy,
        'cohen_kappa_score': cohen_kappa,
        'classes': classes
    }

    return round_dict(output, 4)

def round_dict(data, n_digits):
    """
    Recursively round all floats in a dictionary to n digits.

    :param data: the dictionary
    :type data: dict
    :param n_digits: amount of digits to round to
    :type n_digits: int
    :return: the dictionary with values rounded
    :rtype: dict
    """

    result = data.copy()

    for key, value in data.items():
        if isinstance(value, float):
            result[key] = round(value, n_digits)
        elif isinstance(value, dict):
            result[key] = round_dict(value, n_digits)
        elif isinstance(value, list):
            result[key] = round_list(value, n_digits)

    return result

def round_list(data, n_digits):
    """
    Recursively round all floats in a list to n digits.

    :param data: the list to round
    :type data: list
    :param n_digits: amount of digits to round to
    :type n_digits: int
    :return: the list with values rounded
    :rtype: list
    """

    result = data.copy()

    for i, value in enumerate(data):
        if isinstance(value, float):
            result[i] = round(value, n_digits)
        elif isinstance(value, list):
            result[i] = round_list(value, n_digits)

    return result
