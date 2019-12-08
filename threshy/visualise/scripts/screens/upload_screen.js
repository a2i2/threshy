const uploadScreen = {
    props: {
        value: {
            type: Object,
            default: function() {
                return {
                    selectedFile: null,
                    selectedProblem: 0,
                    settingsData: null,
                    results: null,
                }
            }
        }
    },
    data: function() {
        return {
            instructions: [
                "Binary instructions here...",
                "Multi-class instructions here...",
                "Mutli-label instructions here..."
            ],
            hasError: false,
            errorMsg: null,
            isLoading: false,
        }
    },
    methods: {
        onFileQueue: function(event) {
            const newValue = {
                ...this.value,
                selectedFile: event.target.files[0]
            };
            this.$emit("input", newValue);

            event.target.value = null;
        },
        onProblemSelect: function(event) {
            const newValue = {
                ...this.value,
                selectedProblem: event.target.selectedIndex
            };
            this.$emit("input", newValue);
        },
        validate: function() {
            const data = this.value;
            const settings = this.value.settingsData;

            return true;
        },
        submitForm: function() {
            this.hasError = false;

            // Validate settings
            if (!this.validate())
                return;

            const self = this;
            const data = this.value;
            const settings = this.value.settingsData;

            const form = new FormData();
            form.append("file", data.selectedFile);
            form.append("idLabel", settings.idColumn);
            form.append("groundTruthLabel", settings.truthColumn);
            form.append("rejectLabel", settings.rejectLabel);
            form.append("minValue", settings.min);
            form.append("maxValue", settings.max);
            form.append("separator", settings.separator);

            if (settings.targetLabel != null)
                form.append("targetLabel", settings.targetLabel);

            if (settings.probabilityColumn != null)
                form.append("probabilityLabel", settings.probabilityColumn);

            var request = new XMLHttpRequest();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        const response = JSON.parse(request.response);
                        
                        const newValue = {
                            ...self.value,
                            results: response
                        };
                        self.$emit('input', newValue);
                        self.$emit('screen-change', 'visualise');
                    }
                    else if (request.status == 400) {
                        const response = JSON.parse(request.response);
                        self.hasError = true;
                        self.errorMsg = response.errorMessage;
                    }

                    self.isLoading = false;
                }
            }
            request.open("POST", "./upload_csv", true);
            request.send(form);
            this.isLoading = true;
        },
    },
    template: `
        <div class="screen-container">
            <p class="title">Prepare & Upload</p>
            <hr class="hr" />

            <article class="message is-info">
                <div class="message-header">
                    <p>
                        <span class="icon"><i class="fas fa-info-circle"></i></span>
                        <span>Instructions</span>
                    </p>
                </div>
                <div class="message-body">
                    <p>Text shared across problem types here...</p>
                    <p>{{ instructions[value.selectedProblem] }}</p>
                </div>
            </article>

            <div v-if="hasError" class="notification is-danger">
                <button v-on:click="hasError = false" class="delete"></button>
                <span class="icon"><i class="fas fa-exclamation-circle"></i></span>
                <span><strong>ERROR:</strong> {{ errorMsg }}</span>
            </div>

            <div class="level">
                <div class="level-left">
                    <div class="level-item">
                        <div class="field">
                            <label class="label">Problem:</label>
                            <div class="control">
                                <div class="select">
                                    <select v-on:change="onProblemSelect">
                                        <option :selected="value.selectedProblem == 0">Binary</option>
                                        <option :selected="value.selectedProblem == 1">Multi-class</option>
                                        <option :selected="value.selectedProblem == 2">Multi-label</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="level-item">
                        <div class="field">
                            <label class="label">File:</label>
                            <div class="control">
                                <div class="file has-name">
                                    <label class="file-label">
                                        <input v-on:change="onFileQueue" class="file-input" type="file" />
                                        <span class="file-cta">
                                            <span class="file-icon"><i class="fas fa-upload"></i></span>
                                            <span class="file-label">Browse for CSV...</span>
                                        </span>
                                        <span class="file-name">{{ value.selectedFile != null ? value.selectedFile.name : "None selected" }}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="level-right">
                    <button class="button" v-on:click="$emit('screen-change', 'settings')">
                        <span class="icon"><i class="fas fa-cogs"></i></span>
                        <span>Settings</span>
                    </button>
                </div>
            </div>
            
            <div class="level">
                <div class="level-left"></div>
                <div class="level-right">
                    <button v-on:click="submitForm" :class="{ 'is-loading': isLoading }" class="button is-info">
                        <span class="icon"><i class="fas fa-arrow-circle-right"></i></span>
                        <span>Visualise & Explore</span>
                    </button>
                </div>
            </div>
        </div>
    `
};

Vue.component("upload-screen", uploadScreen);