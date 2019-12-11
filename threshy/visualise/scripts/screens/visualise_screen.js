const visualiseScreen = {
    props: {
        value: Object,
        metricResults: Object
    },
    data: function() {
        return {
            selectedIndex: 0,
            logs: [],
            globalThreshold: 0.51,
            currentRequests: []
        }
    },
    computed: {
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
        }
    },
    mounted: function() {
        this.updateThresholds(0.51);
        this.fetchSession();
    },
    methods: {
        onThresholdChange: function(newValue) {
            this.updateThresholds(newValue);
            this.fetchSession();
            this.writeLog("INFO", "Setting all label thresholds to: " + newValue);
        },
        updateThresholds: function(newValue) {
            // Remove \054 and replace with comma since illegal in cookie value
            var labels = getCookie("labels").replace(/\\054/g, ',');
            if (labels != "") {
                labels = JSON.parse(JSON.parse(labels));
                labels.forEach(label => {
                    document.cookie = label + "_threshold=" + newValue;
                });
            }
        },
        fetchSession: function() {
            const self = this;
            const request = new XMLHttpRequest();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        const response = JSON.parse(request.response);

                        self.writeLog("INFO", "Received matrices & summaries!")
                        self.$emit('new-metrics', response);
                    }
                    else {
                        // TODO: No results found
                    }

                    self.currentRequests.splice(self.currentRequests.indexOf(request), 1);
                }
            }

            request.open("GET", "./metrics", true);
            request.send();
            self.writeLog("INFO", "Loading matrices & summaries for current session...");
            self.currentRequests.push(request);
        },
        writeLog: function (level, message) {
            const now = new Date().toISOString();
            this.logs.push(now + " - " + level + " - " + message);
            this.$nextTick(function() {
                const logOutput = document.getElementById("log-output");
                if (logOutput != null)
                    logOutput.scrollTop = logOutput.scrollHeight;
            });
        },
    },
    template: `
        <div class="screen-container">
            <p class="title">
                <span>Visualise & Explore</span>
                <span v-if="isLoading" class="icon" style="margin-left: 10px"><i class="fas fa-sync fa-spin"></i></span>
            </p>
            <hr class="hr" />

            <div v-if="metricResults != null">
            <article class="message is-info">
                <div class="message-header">
                    <p>
                        <span class="icon"><i class="fas fa-info-circle"></i></span>
                        <span>Instructions</span>
                    </p>
                </div>
                <div class="message-body">
                    <p>On this page you can experiment with a single threshold applied to all labels and inspect the results for each label.</p>
                </div>
            </article>

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

            <h2 class="title is-4">Global Threshold:</h2>
            <slider v-on:change="onThresholdChange" v-model="globalThreshold"></slider>

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

            <h2 class="title is-4">Log Output:</h2>
            <log ref="log" v-model="logs"></log>

            <hr class="hr" />
            <div class="level">
                <div class="level-left"></div>
                <div class="level-right">
                    <div class="level-item">
                        <button v-on:click="$emit('screen-change', 'export')" class="button is-info">
                            <span class="icon"><i class="fas fa-arrow-circle-right"></i></span>
                            <span>Export</span>
                        </button>
                    </div>
                    <div class="level-item">
                        <button v-on:click="$emit('screen-change', 'cost')" class="button is-info">
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

Vue.component('visualise-screen', visualiseScreen);
