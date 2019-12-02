import numpy as np

def calculate_cost(predicted_matrix, cost_weights, portion_size, estimate_size):
    cost_per_prediction = np.array(cost_weights) / portion_size
    scaled_matrix = np.round(predicted_matrix.astype(np.double) / predicted_matrix.sum() * estimate_size)
    return scaled_matrix * cost_per_prediction

def calculate_all_costs(all_matrices, cost_weights, portion_size, estimate_size):
    cost_results = np.zeros((len(all_matrices), 3, 3))
    for i, a in enumerate(all_matrices):
        cost_results[i] = calculate_cost(a, cost_weights, portion_size, estimate_size)
    return cost_results
