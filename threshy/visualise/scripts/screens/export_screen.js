const exportScreen = {
    props: {
        metricResults: Object,
        costResults: Array,
    },
    data: function() {
        return {
            isLoading: false
        }
    },
    computed: {
        thresholds() {
            return this.metricResults.labels.map(label => {
                const cookieValue = getCookie(label + "_threshold");
                if (cookieValue != "") {
                    return {
                        name: label,
                        value: parseFloat(cookieValue)
                    }
                }
            });
        }
    },
    methods: {
        exportJSON: function() {
            const exportObj = this.metricResults.labels.map((label, i) => {
                return {
                    name: label,
                    threshold: this.thresholds[i].value,
                    distribution: this.metricResults.distributions[i]
                }
            });

            const a = document.createElement("a");
            a.href = 'data:text/plain;charset=utf-8,' + JSON.stringify(exportObj, null, 4);
            a.setAttribute("download", "export.json");
            a.click();
        }
    },
    template: `
        <div class="screen-container">
            <p class="title">Review & Export</p>
            <hr class="hr" />

            <article class="message is-info">
                <div class="message-header">
                    <p>
                        <span class="icon"><i class="fas fa-info-circle"></i></span>
                        <span>Instructions</span>
                    </p>
                </div>
                <div class="message-body">
                    <p>Review & Export instructions here...</p>
                </div>
            </article>

            <button v-on:click="exportJSON" :class="{ 'is-loading': isLoading }" class="button is-primary">
                <span class="icon"><i class="fas fa-download"></i></span>
                <span>Export JSON</span>
            </button>
            <hr class="hr" />

            <p class="title is-4">Results Summary:</p>
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
                                    <p class="title is-3">{{ costResults != null ? '$' + costResults[0] : 'N/A' }}</p>
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
                                    <p class="title is-3">{{ costResults != null ? '$' + costResults[1] : 'N/A' }}</p>
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
                                    <p class="title is-3">{{ costResults != null ? '$' + costResults[2] : 'N/A' }}</p>
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

            <table class="table is-hoverable">
                <thead>
                    <tr>
                        <th>Label</th>
                        <th>Threshold</th>
                        <th>Distrubution</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(label, index) in metricResults.labels">
                        <td>{{ label }}</td>
                        <td>{{ thresholds[index].value }}</td>
                        <td>{{ metricResults.distributions[index] }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `
};

Vue.component('export-screen', exportScreen);