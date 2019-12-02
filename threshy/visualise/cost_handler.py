import json
import numpy as np
import tornado.web

from .visualise_classifier import summarise_results

def calculate_cost(predicted_matrix, cost_weights, portion_size, estimate_size):
    cost_per_prediction = np.array(cost_weights) / portion_size
    scaled_matrix = np.round(predicted_matrix.astype(np.double) / predicted_matrix.sum() * estimate_size)
    return scaled_matrix * cost_per_prediction

def calculate_all_costs(all_matrices, cost_weights, portion_size, estimate_size):
    cost_results = np.zeros((len(all_matrices), 3, 3))
    for i, a in enumerate(all_matrices):
        cost_results[i] = calculate_cost(a, cost_weights, portion_size, estimate_size)
    return cost_results

class CostHandler(tornado.web.RequestHandler):
    def post(self):
        inputs = json.loads(self.request.body)

        matrices = inputs["matrices"]
        cost_matrix = inputs["costMatrix"]
        portion_size = inputs["portionSize"]
        estimate_size = inputs["estimateSize"]

        cost_results = calculate_all_costs(np.asarray(matrices), cost_matrix, portion_size, estimate_size)
        summary = summarise_results(cost_results)

        self.set_status(200)
        self.write({
            "cost_results": cost_results.tolist(),
            "summary": summary.tolist()
        })
