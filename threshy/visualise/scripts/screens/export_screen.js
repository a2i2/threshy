const exportScreen = {
    props: {

    },
    data: function() {
        return {
            isLoading: false
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
        thresholds() {
            return this.labels.map(label => {
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
            const self = this;
            const request = new XMLHttpRequest();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        const response = JSON.parse(request.response);
                        const thresholds = self.thresholds;
                        const exportObj = response.labels.map((label, i) => {
                            return {
                                name: label,
                                threshold: thresholds[i].value,
                                distribution: response.distributions[i]
                            }
                        });

                        const a = document.createElement("a");
                        a.href = 'data:text/plain;charset=utf-8,' + JSON.stringify(exportObj, null, 4);
                        a.setAttribute("download", "export.json");
                        a.click();
                    }

                    self.isLoading = false;
                }
            }

            request.open("GET", "./metrics", true);
            request.send();
            this.isLoading = true;
        }
    },
    template: `
        <div class="screen-container">
            <p class="title">Export</p>
            <hr class="hr" />

            <button v-on:click="exportJSON" :class="{ 'is-loading': isLoading }" class="button is-primary">
                <span class="icon"><i class="fas fa-download"></i></span>
                <span>Export JSON</span>
            </button>
        </div>
    `
};

Vue.component('export-screen', exportScreen);