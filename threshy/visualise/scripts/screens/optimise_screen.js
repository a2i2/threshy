const optimiseScreen = {
    props: {
        value: Object
    },
    data: function() {
        return {
            isOptimising: false,
            showWarning: false,
            logs: [],
            outputType: "formatted"
        }
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
        outputObject() {
            const self = this;
            return this.labels.map((label, i) => {
                return {
                    name: label,
                    threshold: self.value.thresholds[i],
                    distribution: self.value.results.distributions[i]
                }
            })
        },
        output() {
            return JSON.stringify(this.outputObject, null, 4);
        },
        schema() {
            const schema = `
            {
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
    methods: {
        onNext: function() {
            if (this.value == null || this.value.results == null) {
                this.showWarning = true;
                return;
            }

            this.$emit('screen-change', 'review');
        },
        requestResults: function() {
            const self = this;
            const request = new XMLHttpRequest();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        const results = JSON.parse(request.response);
                        const newValue = {
                            ...self.value,
                            results: results
                        }
                        self.$emit('input', newValue);
                        self.$refs.log.writeLog("INFO", "Got results: " + request.response);
                    }
                }
            }
            request.open("GET", "./metrics", true);
            request.send()
            this.$refs.log.writeLog("INFO", "Requesting metrics for new thresholds...");
        },
        optimise: function() {
            const startTime = new Date();
            const self = this;
            const request = new XMLHttpRequest();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        self.$refs.log.writeLog("INFO", "Results: " + request.response);

                        const results = JSON.parse(request.response);
                        self.labels.forEach((label, i) => {
                            self.$refs.log.writeLog("INFO", "Setting label `" + label + "` threshold to: " + results.thresholds[i]);
                            document.cookie = label + "_threshold=" + results.thresholds[i];
                        });

                        const timeInSec = ((new Date()) - startTime) / 1000;
                        self.$refs.log.writeLog("INFO", "Took " + timeInSec + " seconds!");

                        const newValue = {
                            ...self.value,
                            thresholds: results.thresholds
                        };
                        self.$emit('input', newValue);
                        self.requestResults();
                    }

                    self.isOptimising = false;
                }
            }
            request.open("GET", "./optimise");
            request.send();
            this.isOptimising =  true;
            this.$refs.log.writeLog("INFO", "Starting optimisation, this may take a while...");
        }
    },
    template: `
        <div class="screen-container">
            <p class="title">Optimise</p>
            <hr class="hr" />

            <div v-if="showWarning" class="notification is-warning">
                <p>
                    <span class="icon"><i class="fas fa-exclamation-circle"></i></span>
                    <span><strong>WARNING:</strong> You haven't optimised yet! Please do so before moving on.</span>
                </p>
                <button v-on:click="showWarning = false" class="delete"></button>
            </div>

            <div class="field has-addons">
                <div class="control">
                    <div class="select">
                        <select>
                            <option>Genetic Algorithm</option>
                            <option>Bayesian Optimisation</option>
                        </select>
                    </div>                                
                </div>
                <div class="control">
                    <button v-if="!isOptimising" v-on:click="optimise" class="button is-info">
                        <span class="icon"><i class="fas fa-cogs"></i></span><span>Optimise</span>
                    </button>

                    <button v-if="isOptimising" class="button is-info" title="This may take a while..." disabled>
                        <span class="icon"><i class="fas fa-cog fa-spin"></i></span><span>Optimising...</span>
                    </button>
                </div>
            </div>

            <h2 class="title is-4">Log Output:</h2>
            <log ref="log" v-model="logs"></log>

            <div v-if="value != null && value.results != null">
                <hr class="hr" />
                <h2 class="title is-4">Output:</h2>
                <div class="level">
                    <div class="level-left">
                        <div class="level-item">
                            <div class="tabs">
                                <ul>
                                    <li :class="{ 'is-active': outputType == 'formatted' }"><a v-on:click="outputType = 'formatted'">Formatted</a></li>
                                    <li :class="{ 'is-active': outputType == 'json' }"><a v-on:click="outputType = 'json'">JSON</a></li>
                                    <li :class="{ 'is-active': outputType == 'schema' }"><a v-on:click="outputType = 'schema'">Schema</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="level-right">
                    </div>
                </div>
                <div v-if="outputType == 'formatted'">
                    <table class="table is-hoverable">
                        <thead>
                            <tr>
                                <th>Label</th>
                                <th>Threshold</th>
                                <th>Support</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="label in outputObject">
                                <td>{{ label.name }}</td>
                                <td>{{ label.threshold }}</td>
                                <td>{{ label.distribution }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-else-if="outputType == 'json'">
                    <code>{{ output }}</code>
                </div>
                <div v-else>
                    <code>{{ schema }}</code>
                </div>
            </div>
    
            <hr class="hr" />
            <div class="level">
                <div class="level-left"></div>
                <div class="level-right">
                    <div class="level-item">
                        <button v-on:click="$emit('screen-change', 'export')" class="button is-info" :disabled="isOptimising">
                            <span class="icon"><i class="fas fa-arrow-circle-right"></i></span>
                            <span>Export</span>
                        </button>
                    </div>
                    <div class="level-item">
                        <button v-on:click="onNext" class="button is-info" :disabled="isOptimising">
                            <span class="icon"><i class="fas fa-arrow-circle-right"></i></span>
                            <span>Next</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
    `
};

Vue.component('optimise-screen', optimiseScreen);