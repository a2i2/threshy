const reviewScreen = {
    props: {

    },
    data: function() {
        return {
            selectedIndex: 0,
            thresholds: [],
            currentRequests: [],
            results: null
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
            return this.results.matrices.map(matrix => {
                return {
                    matrix: matrix,
                    classes: this.results.labels
                }
            });
        },
        isLoading() {
            return this.currentRequests.length > 0;
        }
    },
    methods: {
        fetchSession: function() {
            const self = this;
            const request = new XMLHttpRequest();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        self.results = JSON.parse(request.response);
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
        onThresholdChange: function(value, label) {
            document.cookie = label + "_threshold=" + value;
            this.fetchSession();
        }
    },
    template: `
        <div class="screen-container">
        <p class="title">
            <span>Fine Tuning</span>
            <span v-if="isLoading" class="icon" style="margin-left: 10px"><i class="fas fa-sync fa-spin"></i></span>
        </p>
            <hr class="hr" />

            <div v-if="results != null">
            <article class="message is-info">
                <div class="message-header">
                    <p>
                        <span class="icon"><i class="fas fa-info-circle"></i></span>
                        <span>Instructions</span>
                    </p>
                </div>
                <div class="message-body">
                    <p>Fine tuning instructions here...</p>
                </div>
            </article>

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
                                    <p class="title is-3">{{ results.summary[0] }}</p>
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
                                    <p class="title is-3">{{ results.summary[1] }}</p>
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
                                    <p class="title is-3">{{ results.summary[2] }}</p>
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

            <h2 class="title is-4">Confusion Matrix:</h2>
            <div class="columns">
                <div class="column is-one-fifth">
                    <aside class="menu">
                        <label class="label">Show Label:</label>
                        <ul class="menu-list">
                            <li v-for="(label, index) in results.labels">
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