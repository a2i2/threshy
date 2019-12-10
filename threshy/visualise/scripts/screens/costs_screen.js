const costsScreen = {
    props: {
        value: {
            type: Object,
            default: function() {
                return {
                    costSessions: [
                        {
                            name: "Financial",
                            portionSize: 1000,
                            estimateSize: 10000,
                            costMatrices: []
                        }
                    ]
                }
            }
        },
        results: Object,
    },
    data: function() {
        return {
            selectedCostIndex: 0,
            selectedCostMatrixIndex: 0,
            newStrategyModal: {
                isActive: false,
                name: null
            }
        }
    },
    mounted: function() {
        const selectedCostIndexCookie = getCookie("selected_cost_index");
        if (selectedCostIndexCookie != "")
            this.selectedCostIndex = parseInt(selectedCostIndexCookie);

        const costSessionsCookie = getCookie("cost_sessions")
        if (this.value == null && costSessionsCookie == "") {
            const labels = this.labels;
            const newValue = {
                costSessions: [
                    {
                        name: "Finanical",
                        portionSize: 1000,
                        estimateSize: 10000,
                        costMatrices: labels.map(label => {
                            return {
                                matrix: populateNDimArray(createNDimArray([3, 3]), 0),
                                classes: labels,
                            }
                        }),
                        results: null
                    }
                ]
            };
            this.$emit('input', newValue);
        }
        else if (this.value == null) {
            const newValue = {
                costSessions: JSON.parse(costSessionsCookie)
            }
            this.$emit('input', newValue);
        }

        this.$nextTick(function() {
            this.fetchCostMatrix();
        });
    },
    computed: {
        labels() {
            var labels = getCookie("labels").replace(/\\054/g, ',');
            if (labels != "") {
                labels = JSON.parse(JSON.parse(labels));
                return labels;
            }
            
            return [];
        }
    },
    methods: {
        updateCost: function() {
            document.cookie = "cost_sessions=" + JSON.stringify(this.value.costSessions);
            this.fetchCostMatrix();
        },
        onNewCostMatrix: function(matrix) {
            const costSessions = this.value.costSessions;
            costSessions[this.selectedCostIndex].costMatrices[this.selectedCostMatrixIndex] = {
                matrix: matrix,
                classes: this.labels,
            }
            const newValue = {
                ...this.value,
                costSessions
            }
            this.$emit('input', newValue);

            document.cookie = "cost_sessions=" + JSON.stringify(costSessions);
            this.fetchCostMatrix();
        },
        onCostSessionChange: function(event) {
            const newIndex = this.value.costSessions.findIndex(s => s.name == event.target.value);
            this.selectedCostIndex = newIndex;
            document.cookie = "selected_cost_index=" + newIndex;
        },
        addStrategy: function() {
            if (this.newStrategyModal.name != "" && this.newStrategyModal.name != null && this.value.costSessions.find(e => e.name === this.newStrategyModal.name) == null) {
                const costSessions = this.value.costSessions;
                costSessions.push({
                    name: this.newStrategyModal.name,
                    portionSize: 1000,
                    estimateSize: 10000,
                    costMatrices: this.labels.map(label => {
                        return {
                            matrix: populateNDimArray(createNDimArray([3, 3]), 0),
                            classes: this.labels,
                        }
                    }),
                    results: null
                });

                document.cookie = "cost_sessions=" + JSON.stringify(costSessions);

                const newValue = {
                    ...this.value,
                    costSessions: costSessions
                }
                this.$emit('input', newValue);
            }
            
            this.newStrategyModal.isActive = false;
        },
        fetchCostMatrix: function() {
            const request = new XMLHttpRequest();
            const costIndex = this.selectedCostIndex;
            const self = this;

            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        response = JSON.parse(request.response);
                        
                        const costSessions = self.value.costSessions;
                        costSessions[self.selectedCostIndex] = {
                            ...costSessions[self.selectedCostIndex],
                            results: response
                        }
                        const newValue = {
                            ...self.value,
                            costSessions
                        }
                        self.$emit('input', newValue);
                        self.$emit('new-costs', response.summary);
                    }
                }
            }

            request.open("POST", "./cost_matrix", true);
            request.setRequestHeader("Content-Type", "application/json");
            request.send(JSON.stringify({
                matrices: this.results.matrices,
                costMatrices: this.value.costSessions[costIndex].costMatrices.map(obj => obj.matrix),
                portionSize: parseInt(this.value.costSessions[costIndex].portionSize),
                estimateSize: parseInt(this.value.costSessions[costIndex].estimateSize)
            }));
        }
    },
    template: `
        <div v-if="value != null" class="screen-container">
            <p class="title">Add Costs</p>
            <hr class="hr" />
            
            <article class="message is-info">
                <div class="message-header">
                    <p>
                        <span class="icon"><i class="fas fa-info-circle"></i></span>
                        <span>Instructions</span>
                    </p>
                </div>
                <div class="message-body">
                    <p>Cost estimation instructions here...</p>
                </div>
            </article>

            <div class="columns">
                <div class="column">
                    <label class="label">Cost:</label>
                    <div class="field has-addons">
                        <div class="control is-expanded">
                            <div class="select is-fullwidth">
                                <select v-on:change="onCostSessionChange">
                                    <option v-for="(cost, index) in value.costSessions" :selected="index == selectedCostIndex">{{ cost.name }}</option>
                                </select>
                            </div>
                        </div>
                        <div class="control">
                            <button v-on:click="newStrategyModal.isActive = true" class="button is-primary">
                                <span class="icon"><i class="fas fa-plus"></i></span>
                                <span>New</span>
                            </button>
                        </div>
                    </div>
                    
                </div>
                <div class="column">
                    <div class="field" style="clear: both">
                        <label class="label">Portion Size:</label>
                        <div class="control">
                            <input v-model="value.costSessions[selectedCostIndex].portionSize" v-on:input="updateCost" class="input" type="number" />
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="field">
                        <label class="label">Estimate Size:</label>
                        <div class="control">
                            <input v-model="value.costSessions[selectedCostIndex].estimateSize" v-on:input="updateCost" class="input" type="number" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="columns">
                <div class="column is-one-third">
                    <aside class="menu">
                        <label class="label">Show Label:</label>
                        <ul class="menu-list">
                            <li v-for="(label, index) in labels">
                                <a :title="label" v-on:click="selectedCostMatrixIndex = index" v-bind:class="{ 'is-active': index == selectedCostMatrixIndex }">
                                    {{ label }}
                                </a>
                            </li>
                        </ul>
                    </aside>
                </div>
                <div class="column">
                    <div class="level">
                        <div class="level-item">
                            <confusion-matrix is-editable name="cost-matrix" :report="value.costSessions[selectedCostIndex].costMatrices[selectedCostMatrixIndex]" :on-new-matrix="onNewCostMatrix"></confusion-matrix>
                        </div>
                    </div>
                </div>
            </div>

            <p class="title is-4">Results:</p>
            <div class="columns">
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <div class="level" style="margin-bottom: 0">
                                <div class="level-item">
                                    <p class="title is-3">{{ value.costSessions[selectedCostIndex].results != null ? ("$" + value.costSessions[selectedCostIndex].results.summary[0]) : "N/A" }}</p>
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
                                    <p class="title is-3">{{ value.costSessions[selectedCostIndex].results != null ? ("$" + value.costSessions[selectedCostIndex].results.summary[1]) : "N/A" }}</p>
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
                                    <p class="title is-3">{{ value.costSessions[selectedCostIndex].results != null ? ("$" + value.costSessions[selectedCostIndex].results.summary[2]) : "N/A" }}</p>
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

            <div class="modal" :class="{ 'is-active': newStrategyModal.isActive }">
                <div class="modal-background"></div>
                <div class="modal-card">
                    <div class="modal-card-head">
                        <div class="modal-card-title">New Strategy</div>
                        <button v-on:click="newStrategyModal.isActive = false" class="delete"></button>
                    </div>
                    <div class="modal-card-body">
                        <div class="field">
                            <label class="label">Strategy Name:</label>
                            <div class="control">
                                <input v-model="newStrategyModal.name" class="input" type="text" />
                            </div>
                        </div>
                    </div>
                    <div class="modal-card-foot">
                        <button v-on:click="addStrategy" class="button is-success">Add</button>
                        <button v-on:click="newStrategyModal.isActive = false" class="button">Cancel</button>
                    </div>
                </div>
            </div>
            <hr class="hr" />

            <div class="level">
                <div class="level-left"></div>
                <div class="level-right">
                    <div class="level-item">
                        <button v-on:click="$emit('screen-change', 'optimise')" class="button is-info">
                            <span class="icon"><i class="fas fa-arrow-circle-right"></i></span>
                            <span>Next</span>
                        </button>
                    </div>
                    <div class="level-item">
                        <button v-on:click="$emit('screen-change', 'export')" class="button is-info">
                            <span class="icon"><i class="fas fa-arrow-circle-right"></i></span>
                            <span>Export</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
};

Vue.component('costs-screen', costsScreen);