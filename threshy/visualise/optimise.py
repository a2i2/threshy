import numpy as np
import scipy.stats as stats

from pymoo.model.repair import Repair
from pymoo.model.problem import Problem
from pymoo.optimize import minimize
from pymoo.algorithms.nsga2 import NSGA2
from pymoo.factory import *
from pymoo.model.sampling import Sampling

from .visualise_classifier import *

class MyRepair(Repair):

    def _do(self, problem, pop, **kwargs):
        for i in range(len(pop)):
            x = pop[i].X
            pop[i].X = np.around(x, decimals=2)
        return pop

class FindThresholds(Problem):
    def __init__(self, probabilities, ground_truth, **kwargs):
        self.probabilities = probabilities     
        self.ground_truth = ground_truth
        n_var = probabilities.shape[1]
        super().__init__(n_var=n_var, 
                         n_constr=0, 
                         n_obj=4, 
                         xl=np.zeros((n_var,), dtype=np.int), 
                         xu=np.ones((n_var,), dtype=np.int),  
                         type_var=np.int, 
                         elementwise_evaluation=True)
    
    def _evaluate(self, X, out, *args, **kwargs):
        f0 = []
        f1 = []
        f2 = []
        f3 = []
        thresholds = X 
        all_matrices, thresholded = get_objective(self.probabilities, self.ground_truth, thresholds, thresholds)
        
        # TODO: Trial optimisin        
        # all_matrices = calculate_all_costs(all_matrices, params["cost"]["matrix"], params["cost"]["portion_size"], params["cost"]["estimate_size"])
        
        true_matches, false_matches, missed_matches, rejects = summarise_results(all_matrices)
        
        f0.append(true_matches * -1)   # True matches need to be maximised, pymoo only minimises
        f1.append(false_matches)
        f2.append(missed_matches)
        f3.append(rejects)
            
        out["F"] = np.column_stack([f0, f1, f2, f3]).astype(np.double)

class BetaDistribution(Sampling):
    def __init__(self):
        super().__init__()

    def _do(self, problem, n_samples, **kwargs):        
        return stats.beta(a=4, b=2).rvs(size=(n_samples, problem.n_var))

def optimise(df, inputs, ground_truth_path=None):
    # Load the labels from the dataframe
    labels = prepare_labels(df, inputs)

    # Normalise probabilities
    normalise_probs_in_place(df, inputs, labels)
    probabilities = derive_probabilities(df, inputs)

    # Generate numpy arrays for GT and probabilities
    mapping = {label: i for i, label in enumerate(labels)}
    np_ground_truth = retrieve_ground_truth(df, inputs, labels, mapping, ground_truth_path)
    np_probs = probabilities[labels].to_numpy()

    algorithm = NSGA2(
        pop_size=40,
        n_offsprings=10,
        repair=MyRepair(),
        sampling= BetaDistribution(), #get_sampling("int_lhs"),
        crossover=get_crossover("real_sbx", prob=0.9, eta=15),
        mutation=get_mutation("real_pm", eta=20),
    )    

    # Execute optimisation
    problem = FindThresholds(np_probs, np_ground_truth, parallelizable=("threads", 4))
    results = minimize(problem,
               algorithm,
               ("n_gen", 10),
               save_history=True,
               verbose=True)

    # Generate the results
    F = results.F
    weights = np.array([0.5,0.25,0.25,0])
    I = get_decomposition("weighted-sum").do(F, weights).argmin()
    
    new_thresholds = results.X[I].tolist()

    return {
        "thesholds": new_thresholds
    }

def main():
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

    optimise(df, inputs)

if __name__ == "__main__":
    main()
