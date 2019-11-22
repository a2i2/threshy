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

function uploadCSV(file, gtLabel, predLabel, probLabel, separator) {
    return new Promise((resolve, reject) => {
        var formData = new FormData();
        formData.append("file", file);
        formData.append("groundTruthLabel", gtLabel);
        formData.append("predictLabel", predLabel);
        formData.append("probabilityLabel", probLabel);
        formData.append("separator", separator);

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
        }
    }

    request.open("GET", "./metrics", true);
    request.send();
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
            truthColumn: null,
            predictColumn: null,
            probabilityColumn: null,
            separator: null,
            hasError: false,
            errorMessage: ""
        },
        content: {
            isActive: false,
            report: {
                confusion_matrix: null,
                classes: null,
                report: null,
                normalized_confusion_matrix: null,
                accuracy_score: null,
                cohen_kappa_score: null
            },
            costMatrix: {
                confusion_matrix: null,
                classes: null,
            }
        },
        thresholds: []
    },
    computed: {
        report() {
            return this.content.report
        },
        thresholdGroups() {
            const thresholds = this.thresholds;
            const groupSize = 3;
            const results = [];

            for (var i = 0; i < thresholds.length; i += groupSize)
                results.push(thresholds.slice(i, i + groupSize));

            return results;
        }
    },
    watch: {
        report: {
            handler: function() {
                // Get the thresholds from the cookies
                this.thresholds = this.content.report.classes.map(label => { 
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
                        confusion_matrix: populateNDimArray(createNDimArray([this.report.classes.length, this.report.classes.length]), 0),
                        classes: this.report.classes
                    };
                }
            },
            deep: true
        },
        thresholds: {
            handler: function() {
                // Update the thresholds cookies
                this.thresholds.forEach(threshold => {
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
                confusion_matrix: matrix,
                classes: this.content.report.classes
            }

            document.cookie = "cost_matrix=" + JSON.stringify(this.content.costMatrix)
        },
        onThresholdChange: function(val, className) {
            document.cookie = className + "_threshold=" + val; 
        },
        onFileQueue: function(event) {
            this.newModal.selectedFile = event.target.files[0];
            event.target.value = null;
        },
        resetNewModal: function() {
            app.newModal = {
                isActive: true,
                isLoading: false,
                selectedFile: null,
                truthColumn: null,
                predictColumn: null,
                probabilityColumn: null,
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
            const gtLabel = checkValue(this.newModal.truthColumn, "ground-truth");
            const predLabel = checkValue(this.newModal.predictColumn, "predict");
            const probLabel = checkValue(this.newModal.probabilityColumn, "confidence");
            const separator = checkValue(this.newModal.separator, ",");

            // Upload the CSV file with the user specified properties
            uploadCSV(app.newModal.selectedFile, gtLabel, predLabel, probLabel, separator)
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
