function populateNDimArray(matrix, value) {
    const cols = matrix[0].length;
    const rows = matrix.length;

    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            matrix[i][j] = value;
        }
    }
    
    return matrix;
}

function createNDimArray(dimensions) {
    if (dimensions.length > 0) {
        var dim = dimensions[0];
        var rest = dimensions.slice(1);
        var newArray = new Array();
        for (var i = 0; i < dim; i++) {
            newArray[i] = createNDimArray(rest);
        }
        return newArray;
    } 
    else {
        return undefined;
    }
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}

function uploadCSV(file, inputs) {
    return new Promise((resolve, reject) => {
        var formData = new FormData();
        formData.append("file", file);
        formData.append("idLabel", inputs.idLabel);
        formData.append("groundTruthLabel", inputs.gtLabel);
        formData.append("rejectLabel", inputs.rejectLabel);
        formData.append("minValue", inputs.minValue);
        formData.append("maxValue", inputs.maxValue);
        formData.append("separator", inputs.separator);

        if (inputs.targetLabel != null)
            formData.append("targetLabel", inputs.targetLabel);

        if (inputs.probLabel != null)
            formData.append("probabilityLabel", inputs.probLabel);

        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                if (request.status == 200)
                    resolve(JSON.parse(request.response));
                else if (request.status == 400)
                    reject(JSON.parse(request.response));
            }
        }
        request.open("POST", "./upload_csv", true);
        request.send(formData);
    });
}

function checkForSession(app) {
    const request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            response = JSON.parse(request.response);
            // Show metrics, etc.
            app.content.isActive = true;
            app.content.report = response;

            // Remove the request from the queue
            app.currentRequests.splice(app.currentRequests.indexOf(request), 1);
        }
    }

    request.open("GET", "./metrics", true);
    request.send();

    // Track this request in a list
    app.currentRequests.push(request);
}

function fetchCostMatrix(app) {
    const request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            response = JSON.parse(request.response);
            // Show new results
            app.content.costResults = response;

            // Remove the request from the queue
            app.currentRequests.splice(app.currentRequests.indexOf(request), 1);
        }
    }

    request.open("POST", "./cost_matrix", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify({
        matrices: app.content.report.matrices,
        costMatrix: app.content.costMatrix.matrix,
        portionSize: parseInt(app.content.portionSize),
        estimateSize: parseInt(app.content.estimateSize)
    }));

    // Track this request in a list
    app.currentRequests.push(request);
}

function requestOptimisation(app) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                if (request.status == 200) {
                    response = JSON.parse(request.response);

                    // Set thresholds to new optimised ones
                    for (var i = 0; i < app.content.thresholds.length; i++) {
                        Vue.set(app.content.thresholds, i, {
                            name: app.content.thresholds[i].name,
                            value: response.thresholds[i]
                        });
                    }

                    // Refresh the report
                    checkForSession(app);
                }
    
                // Remove the request from the queue
                app.currentRequests.splice(app.currentRequests.indexOf(request), 1);
                resolve();
            }
        }
    
        request.open("GET", "./optimise", true);
        request.send();
    
        // Track this request in a list
        app.currentRequests.push(request);
    });
}

function checkValue(val, def) {
    return val == null || val === "" ? def : val; 
}

var app = new Vue({
    el: "#app",
    data: {
        newModal: {
            isActive: false,
            isLoading: false,
            selectedFile: null,
            idColumn: null,
            truthColumn: null,
            targetLabel: null,
            rejectLabel: null,
            probabilityColumn: null,
            min: 0,
            max: 1,
            separator: null,
            hasError: false,
            errorMessage: ""
        },
        content: {
            isActive: false,
            isOptimising: false,
            report: {
                labels: null,
                matrices: null,
                summary: null
            },
            portionSize: 1000,
            estimateSize: 10000,
            costMatrix: {
                matrix: null,
                classes: null,
            },
            costResults: null,
            thresholds: [],
            selectedMatrixIndex: 0
        },
        currentRequests: []
    },
    computed: {
        report() {
            return this.content.report;
        },
        matrices() {
            return this.content.report.matrices.map(matrix => {
                return {
                    matrix: matrix,
                    classes: this.content.report.labels
                }
            });
        },
        thresholds() {
            return this.content.thresholds;
        },
        thresholdGroups() {
            const thresholds = this.content.thresholds;
            const groupSize = 3;
            const results = [];

            for (var i = 0; i < thresholds.length; i += groupSize)
                results.push(thresholds.slice(i, i + groupSize));

            return results;
        },
        isLoading() {
            return this.currentRequests.length > 0; 
        }
    },
    watch: {
        report: {
            handler: function() {
                // Get the thresholds from the cookies
                this.content.thresholds = this.content.report.labels.map(label => { 
                    var v = getCookie(label + "_threshold")
                    return { 
                        name: label, 
                        value: v === "" ? 0 : v
                    } 
                });

                // Initialize the cost matrix from cookie or empty matrix
                const costMatrixCookie = getCookie("cost_matrix");
                if (costMatrixCookie !== "")
                {
                    this.content.costMatrix = JSON.parse(costMatrixCookie);
                }
                else {
                    this.content.costMatrix = {
                        matrix: populateNDimArray(createNDimArray([3, 3]), 0),
                        classes: this.content.report.labels
                    };
                }

                // Update the cost matrix if the report has changed
                fetchCostMatrix(this);
            },
            deep: true
        },
        thresholds: {
            handler: function() {
                this.content.thresholds.forEach(threshold => {
                    // Update the thresholds cookies
                    document.cookie = threshold.name + "_threshold=" + threshold.value;
                });
            },
            deep: true
        }
    },
    mounted: function() {
        // Check if we have a session in our cookies already, if so load the metrics again.
        this.$nextTick(function() {
            checkForSession(this);
        });
    },
    methods: {
        onNewCostMatrix: function(matrix) {
            this.content.costMatrix = {
                matrix: matrix,
                classes: this.content.report.labels
            };
            document.cookie = "cost_matrix=" + JSON.stringify(this.content.costMatrix)

            fetchCostMatrix(this);
        },
        onFileQueue: function(event) {
            this.newModal.selectedFile = event.target.files[0];
            event.target.value = null;
        },
        onThresholdChange: function(value, label) {
            document.cookie = label + "_threshold=" + value;
            checkForSession(this);
        },
        onTargetLabelChange: function(event) {
            const newIndex = this.content.report.labels.indexOf(event.target.value);
            this.content.selectedMatrixIndex = newIndex;
        },
        updateCost: function(event) {
            fetchCostMatrix(this);
        },
        optimise: function() {
            this.content.isOptimising = true;
            requestOptimisation(this).then(() => {
                app.content.isOptimising = false;
            });
        },
        resetNewModal: function() {
            app.newModal = {
                isActive: true,
                isLoading: false,
                selectedFile: null,
                idColumn: null,
                truthColumn: null,
                targetLabel: null,
                rejectLabel: null,
                probabilityColumn: null,
                min: 0,
                max: 1,
                separator: null,
                hasError: false,
                errorMessage: ""
            }
        },
        clearCookies: function() {
            document.cookie = "cost_matrix=;";
        },
        upload: function(event) {
            app.newModal.isLoading = true;

            // Get the values from the input fields or default them if empty
            const inputs = {
                idLabel: checkValue(this.newModal.idColumn, "id"),
                gtLabel: checkValue(this.newModal.truthColumn, "ground_truth"),
                probLabel: checkValue(this.newModal.probabilityColumn, null),
                targetLabel: checkValue(this.newModal.targetLabel, null),
                rejectLabel: checkValue(this.newModal.rejectLabel, "REJECT"),
                minValue: checkValue(this.newModal.min, 0),
                maxValue: checkValue(this.newModal.max, 1),
                separator: checkValue(this.newModal.separator, ",")
            };

            // Upload the CSV file with the user specified properties
            uploadCSV(app.newModal.selectedFile, inputs)
                .then(response => {
                    // Hide modal
                    app.clearCookies();
                    app.resetNewModal();
                    app.newModal.isActive = false;

                    // Show metrics, etc.
                    app.content.isActive = true;
                    app.content.report = response;
                },
                error => {
                    // Show error
                    app.newModal.isLoading = false;
                    app.newModal.hasError = true;
                    app.newModal.errorMessage = error.errorMessage;
                });
        }
    }
});
