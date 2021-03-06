const reviewScreen = {
    props: {
        metricResults: Object,
    },
    data: function() {
        return {
            selectedIndex: 0,
            thresholds: [],
            currentRequests: [],
            costSummary: [0, 0, 0, 0]
        }
    },
    mounted: function() {
        const thresholds = this.labels.map(label => {
            const cookieValue = getCookie(label + "_threshold");
            if (cookieValue != "") {
                return {
                    name: label,
                    value: parseFloat(cookieValue)
                }
            }
        });

        this.thresholds = thresholds;
        this.fetchSession();
    },
    computed: {
        labels() {
            var labels = getCookie("labels").replace(/\\054/g, ',');
            if (labels != "") {
                labels = JSON.parse(JSON.parse(labels));
                return labels;
            }
            
            return [];
        },
        thresholdGroups() {
            const thresholds = this.thresholds;
            const groupSize = 2;
            const results = [];

            for (var i = 0; i < thresholds.length; i += groupSize)
                results.push(thresholds.slice(i, i + groupSize));

            return results;
        },
        matrices() {
            return this.metricResults.matrices.map(matrix => {
                return {
                    matrix: matrix,
                    classes: this.metricResults.labels
                }
            });
        },
        isLoading() {
            return this.currentRequests.length > 0;
        },
        selectedCostIndex() {
            const cookie = getCookie("selected_cost_index");
            if (cookie != "") {
                return parseInt(cookie);
            }

            return 0;
        },
        costSession() {
            const cookie = getCookie("cost_sessions");
            if (cookie != "") {
                const costSessions = JSON.parse(cookie);
                return costSessions[this.selectedCostIndex]
            }

            return {
                costMatrices: [
                    {
                        matrix: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
                        portionSize: 1000,
                        estimateSize: 10000,
                    }
                ]
            };
        }
    },
    methods: {
        fetchSession: function() {
            const self = this;
            const request = new XMLHttpRequest();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        const response = JSON.parse(request.response);
                        self.$emit('new-metrics', response);
                        self.fetchCostMatrix();
                    }
                    else {
                        // TODO: No results found
                    }

                    self.currentRequests.splice(self.currentRequests.indexOf(request), 1);
                }
            }
        
            request.open("GET", "./metrics", true);
            request.send();
            self.currentRequests.push(request);
        },
        fetchCostMatrix: function() {
            const request = new XMLHttpRequest();
            const self = this;

            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        const response = JSON.parse(request.response);
                        self.costSummary = response.summary;
                        self.$emit('new-costs', response.summary);
                    }
                }
            }

            request.open("POST", "./cost_matrix", true);
            request.setRequestHeader("Content-Type", "application/json");
            request.send(JSON.stringify({
                matrices: this.metricResults.matrices,
                costMatrices: this.costSession.costMatrices.map(obj => obj.matrix),
                portionSize: parseInt(this.costSession.portionSize),
                estimateSize: parseInt(this.costSession.estimateSize)
            }));
        },
        onThresholdChange: function(value, label) {
            document.cookie = label + "_threshold=" + value;
            this.fetchSession();
        }
    },
    template: `
        <div class="screen-container">
        <p class="title">
            <span>Fine Tune</span>
            <span v-if="isLoading" class="icon" style="margin-left: 10px"><i class="fas fa-sync fa-spin"></i></span>
        </p>
            <hr class="hr" />

            <div v-if="metricResults != null">

            <div v-for="group in thresholdGroups" class="columns">
                <div v-for="threshold in group" class="column">
                    <slider v-on:change="onThresholdChange" v-model="threshold.value" :slider-label="threshold.name" :event-data="threshold.name"></slider>
                </div>
            </div>

            <p class="title is-4">Summary Statistics:</p>
            <div class="columns">
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <div class="level" style="margin-bottom: 0">
                                <div class="level-item">
                                    <p class="title is-3">{{ metricResults.summary[0] }}</p>
                                </div>
                            </div>
                            <div class="level">
                                <div class="level-item">
                                    <p class="subtitle">True Positives</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <div class="level" style="margin-bottom: 0">
                                <div class="level-item">
                                    <p class="title is-3">{{ metricResults.summary[1] }}</p>
                                </div>
                            </div>
                            <div class="level">
                                <div class="level-item">
                                    <p class="subtitle">False Positives</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <div class="level" style="margin-bottom: 0">
                                <div class="level-item">
                                    <p class="title is-3">{{ metricResults.summary[2] }}</p>
                                </div>
                            </div>
                            <div class="level">
                                <div class="level-item">
                                    <p class="subtitle">Missed Positives</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="columns">
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <div class="level" style="margin-bottom: 0">
                                <div class="level-item">
                                    <p class="title is-3">{{ costSummary != null ? '$' + costSummary[0] : 'N/A' }}</p>
                                </div>
                            </div>
                            <div class="level">
                                <div class="level-item">
                                    <p class="subtitle">Total True Positives Cost</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <div class="level" style="margin-bottom: 0">
                                <div class="level-item">
                                    <p class="title is-3">{{ costSummary != null ? '$' + costSummary[1] : 'N/A' }}</p>
                                </div>
                            </div>
                            <div class="level">
                                <div class="level-item">
                                    <p class="subtitle">Total False Positives Cost</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <div class="level" style="margin-bottom: 0">
                                <div class="level-item">
                                    <p class="title is-3">{{ costSummary != null ? '$' + costSummary[2] : 'N/A' }}</p>
                                </div>
                            </div>
                            <div class="level">
                                <div class="level-item">
                                    <p class="subtitle">Total Missed Positives Cost</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <h2 class="title is-4">Confusion Matrix:</h2>
            <div class="columns">
                <div class="column is-one-fifth">
                    <aside class="menu">
                        <label class="label">Show Label:</label>
                        <ul class="menu-list">
                            <li v-for="(label, index) in metricResults.labels">
                                <a :title="label" v-on:click="selectedIndex = index" v-bind:class="{ 'is-active': index == selectedIndex }">
                                    {{ label }}
                                </a>
                            </li>
                        </ul>
                    </aside>
                </div>
                <div class="column">
                    <div class="level">
                        <div class="level-item">
                            <confusion-matrix :report="matrices[selectedIndex]"></confusion-matrix>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="hr" />
            <div class="level">
                <div class="level-left"></div>
                <div class="level-right">
                    <div class="level-item">
                        <button v-on:click="$emit('screen-change', 'export')" class="button is-info">
                            <span class="icon"><i class="fas fa-arrow-circle-right"></i></span>
                            <span>Next</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </div>
    `
};

Vue.component('review-screen', reviewScreen);