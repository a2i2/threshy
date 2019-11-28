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
        if (request.readyState == 4) {
            if (request.status == 200) {
                response = JSON.parse(request.response);
                // Show metrics, etc.
                app.content.isActive = true;
                app.content.report = response;
                app.writeLog("INFO", "Received matrices & summaries!")
            }
            else
                app.writeLog("WARNING", "No matrices & summaries found for current session!");

            // Remove the request from the queue
            app.currentRequests.splice(app.currentRequests.indexOf(request), 1);
        }
    }

    request.open("GET", "./metrics", true);
    request.send();

    // Track this request in a list
    app.currentRequests.push(request);
    app.writeLog("INFO", "Loading matrices & summaries for current session...");
}

function fetchCostMatrix(app) {
    const request = new XMLHttpRequest();
    const costIndex = app.content.selectedCostIndex;

    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200) {
                response = JSON.parse(request.response);
                // Show new results
                app.content.costSessions[costIndex].results = response;
            }

            // Remove the request from the queue
            app.currentRequests.splice(app.currentRequests.indexOf(request), 1);
            app.writeLog("INFO", "Received new cost summary from server!");
        }
    }

    request.open("POST", "./cost_matrix", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify({
        matrices: app.content.report.matrices,
        costMatrices: app.content.costSessions[costIndex].costMatrices.map(obj => obj.matrix),
        portionSize: parseInt(app.content.costSessions[costIndex].portionSize),
        estimateSize: parseInt(app.content.costSessions[costIndex].estimateSize)
    }));

    // Track this request in a list
    app.currentRequests.push(request);
    app.writeLog("INFO", "Requesting new cost summary from server..")
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

                    app.writeLog("INFO", "Optimisation results: " + request.response);

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
        newStrategyModal: {
            isActive: false,
            name: null
        },
        optimisationModal: {
            isActive: false,
        },
        content: {
            isActive: false,
            isOptimising: false,
            report: {
                labels: null,
                matrices: null,
                summary: null,
                distributions: null
            },
            costSessions: [
                {
                    name: "Financial",
                    portionSize: 1000,
                    estimateSize: 10000,
                    costMatrices: [
                        {
                            matrix: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
                            classes: null
                        }
                    ],
                    results: null
                }
            ],
            thresholds: [],
            selectedMatrixIndex: 0,
            selectedCostIndex: 0,
            selectedCostMatrixIndex: 0,
            logs: [],
            outputType: "formatted"
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
        },
        metadata() {
            return JSON.stringify(this.metadataObject, null, 2);
        },
        metadataObject() {
            const content = this.content;
            return {
                filename: getCookie("filename"),
                labels: this.content.report.labels.map((label, index) => {
                    return {
                        name: label,
                        threshold: parseFloat(content.thresholds[index].value),
                        distribution: content.report.distributions[index]
                    }
                })
            };
        },
        metadataURI() {
            return 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.metadata);
        },
        schema() {
            const schema = `
            {
                "definitions": {},
                "$schema": "http://json-schema.org/draft-07/schema#",
                "$id": "optimise-output.json",
                "type": "object",
                "title": "The Root Schema",
                "required": [
                    "filename",
                    "labels"
                ],
                "properties": {
                    "filename": {
                        "$id": "#/properties/filename",
                        "type": "string",
                        "title": "The Filename Schema",
                        "default": "",
                        "examples": [
                            "predictions-email-classifier.csv"
                        ],
                        "pattern": "^(.*)$"
                    },
                    "labels": {
                        "$id": "#/properties/labels",
                        "type": "array",
                        "title": "The Labels Schema",
                        "items": {
                            "$id": "#/properties/labels/items",
                            "type": "object",
                            "title": "The Items Schema",
                            "required": [
                                "name",
                                "threshold",
                                "distribution"
                            ],
                            "properties": {
                                "name": {
                                    "$id": "#/properties/labels/items/properties/name",
                                    "type": "string",
                                    "title": "The name of the label",
                                    "default": "",
                                    "examples": ["add_funds"],
                                    "pattern": "^(.*)$"
                                },
                                "threshold": {
                                    "$id": "#/properties/labels/items/properties/threshold",
                                    "type": "number",
                                    "title": "The threshold set for this label",
                                    "default": 0.0,
                                    "examples": [0.82]
                                },
                                "distribution": {
                                    "$id": "#/properties/labels/items/properties/distribution",
                                    "type": "integer",
                                    "title": "The distribution of the label",
                                    "default": 0,
                                    "examples": [0]
                                }
                            }
                        }
                    }
                }
            }`;

            // Remove first 12 chars from each line (just spaces)
            var lines = schema.split("\n");
            lines.splice(0, 1);
            lines = lines.map(line => line.substr(12, line.length - 12));
            var formatted = "";
            lines.forEach(line => formatted += line + "\n");

            return formatted;
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
                        value: v === "" ? 0.51 : v
                    } 
                });

                const costSessionsCookie = getCookie("cost_sessions");
                if (costSessionsCookie !== "") {
                    this.content.costSessions = JSON.parse(costSessionsCookie);
                }
                else {
                    this.content.costSessions = [
                        {
                            name: "Financial",
                            portionSize: 1000,
                            estimateSize: 10000,
                            costMatrices: this.content.report.labels.map(label => {
                                return {
                                    matrix: populateNDimArray(createNDimArray([3, 3]), 0),
                                    classes: this.content.report.labels,
                                }
                            }),
                            results: null
                        }
                    ];
                    document.cookie = "cost_sessions=" + JSON.stringify(this.content.costSessions);
                }

                const selectedCostIndexCookie = getCookie("selected_cost_index");
                if (selectedCostIndexCookie !== "") {
                    this.content.selectedCostIndex = parseInt(selectedCostIndexCookie);
                }
                else {
                    document.cookie = "selected_cost_index=" + this.content.selectedCostIndex;
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
            const costMatrices = this.content.costSessions[this.content.selectedCostIndex].costMatrices;
            costMatrices[this.content.selectedCostMatrixIndex] = {
                matrix: matrix,
                classes: this.content.report.labels,
            }

            Vue.set(this.content.costSessions, this.content.selectedCostIndex, {
                ...this.content.costSessions[this.content.selectedCostIndex],
                costMatrices: costMatrices
            });

            document.cookie = "cost_sessions=" + JSON.stringify(this.content.costSessions);
            this.writeLog("INFO", "Updated cost estimation matrix!");

            fetchCostMatrix(this);
        },
        onFileQueue: function(event) {
            this.newModal.selectedFile = event.target.files[0];
            event.target.value = null;
        },
        onThresholdChange: function(value, label) {
            document.cookie = label + "_threshold=" + value;
            this.writeLog("INFO", "Setting threshold '" + label + "' to " + value);
            checkForSession(this);
        },
        updateCost: function(event) {
            document.cookie = "cost_sessions=" + JSON.stringify(this.content.costSessions);
            this.writeLog("INFO", "Updated cost estimation settings!");
            fetchCostMatrix(this);
        },
        optimise: function() {
            this.content.isOptimising = true;
            this.writeLog("INFO", "Starting optimisation... this may take a while");
            requestOptimisation(this).then(() => {
                app.content.isOptimising = false;
                app.optimisationModal.isActive = true;
                this.writeLog("INFO", "Optimisation complete!");
            });
        },
        addStrategy: function() {
            if (this.newStrategyModal.name != "" && this.newStrategyModal.name != null && this.content.costSessions.find(e => e.name === this.newStrategyModal.name) == null) {
                this.content.costSessions.push({
                    name: this.newStrategyModal.name,
                    portionSize: 1000,
                    estimateSize: 10000,
                    costMatrices: this.content.report.labels.map(label => {
                        return {
                            matrix: populateNDimArray(createNDimArray([3, 3]), 0),
                            classes: this.content.report.labels,
                        }
                    }),
                    results: null
                });

                document.cookie = "cost_sessions=" + JSON.stringify(this.content.costSessions);
            }
            
            this.newStrategyModal.isActive = false;
        },
        onCostSessionChange: function(event) {
            const newIndex = this.content.costSessions.findIndex(s => s.name == event.target.value);
            this.content.selectedCostIndex = newIndex;
            document.cookie = "selected_cost_index=" + newIndex;
        },
        writeLog: function (level, message) {
            const now = new Date().toISOString();
            this.content.logs.push(now + " - " + level + " - " + message);
            this.$nextTick(function() {
                const logOutput = document.getElementById("log-output");
                if (logOutput != null)
                    logOutput.scrollTop = logOutput.scrollHeight;
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
            app.writeLog("INFO", "Uploading CSV with user specified properties...");
            uploadCSV(app.newModal.selectedFile, inputs)
                .then(response => {
                    // Hide modal
                    app.clearCookies();
                    app.resetNewModal();
                    app.newModal.isActive = false;

                    // Show metrics, etc.
                    app.content.isActive = true;
                    app.content.report = response;

                    app.writeLog("INFO", "Successfully uploaded CSV and retrieved results!");
                },
                error => {
                    // Show error
                    app.newModal.isLoading = false;
                    app.newModal.hasError = true;
                    app.newModal.errorMessage = error.errorMessage;

                    app.writeLog("ERROR", error.errorMessage);
                });
        }
    }
});
