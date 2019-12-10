import json
import numpy as np
import tornado.web

from .cost import calculate_all_costs
from .visualise_classifier import summarise_results

class CostHandler(tornado.web.RequestHandler):
    def post(self):
        inputs = json.loads(self.request.body)

        matrices = inputs["matrices"]
        cost_matrices = inputs["costMatrices"]
        portion_size = inputs["portionSize"]
        estimate_size = inputs["estimateSize"]

        cost_matrices = np.asarray(cost_matrices)
        cost_matrix = np.mean(cost_matrices, axis=0).tolist()
    
        cost_results = calculate_all_costs(np.asarray(matrices), cost_matrix, portion_size, estimate_size)
        summary = summarise_results(cost_results)

        self.set_status(200)
        self.write({
            "cost_results": cost_results.tolist(),
            "summary": [round(cost, 2) for cost in summary]
        })
