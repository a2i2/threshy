const settingsScreen = {
    props: {
        value: {
            type: Object,
            default: function() {
                return {
                    idColumn: "id",
                    truthColumn: "ground_truth",
                    probabilityColumn: null,
                    rejectLabel: "REJECT",
                    targetLabel: null,
                    min: "0",
                    max: "1",
                    separator: ","
                }
            }
        }
    },
    data: function() {
        return {
            idColumn: "id",
            truthColumn: "ground_truth",
            probabilityColumn: null,
            rejectLabel: "REJECT",
            targetLabel: null,
            min: "0",
            max: "1",
            separator: ","
        }
    },
    mounted: function() {
        this.idColumn = this.value.idColumn;
        this.truthColumn = this.value.truthColumn;
        this.probabilityColumn = this.value.probabilityColumn;
        this.rejectLabel = this.value.rejectLabel;
        this.targetLabel = this.value.targetLabel;
        this.min = this.value.min;
        this.max = this.value.max;
        this.separator = this.value.separator;
    },
    methods: {
        onSave: function() {
            this.$emit('input', {
                idColumn: this.idColumn,
                truthColumn: this.truthColumn,
                probabilityColumn: this.probabilityColumn,
                rejectLabel: this.rejectLabel,
                targetLabel: this.targetLabel,
                min: this.min,
                max: this.max,
                separator: this.separator
            });

            this.$emit('screen-change', 'upload');
        }
    },
    template: `
        <div class="screen-container">
            <p class="title">Upload Settings</p>
            <hr class="hr" />

            <article class="message is-info">
                <div class="message-header">
                    <p>
                        <span class="icon"><i class="fas fa-info-circle"></i></span>
                        <span>Instructions</span>
                    </p>
                </div>
                <div class="message-body">
                    <p>Settings instructions here..</p>
                </div>
            </article>

            <div class="field is-horizontal">
                <div class="field-label">
                    <label class="label">ID Column: </label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <div class="control is-expanded">
                            <input v-model="idColumn" class="input" type="text" placeholder="Default: id" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="field is-horizontal">
                <div class="field-label">
                    <label class="label">Ground Truth Column: </label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <div class="control is-expanded">
                            <input v-model="truthColumn" class="input" type="text" placeholder="Default: ground_truth" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="field is-horizontal">
                <div class="field-label">
                    <label class="label">Probability Column: </label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <div class="control is-expanded">
                            <input v-model="probabilityColumn" class="input" type="text" placeholder="Default: None" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="field is-horizontal">
                <div class="field-label">
                    <label class="label">Target Label: </label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <div class="control is-expanded">
                            <input v-model="targetLabel" class="input" type="text" placeholder="Default: None" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="field is-horizontal">
                <div class="field-label">
                    <label class="label">Min: </label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <div class="control is-expanded">
                            <input v-model="min" class="input" type="number" placeholder="Default: 0" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="field is-horizontal">
                <div class="field-label">
                    <label class="label">Max: </label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <div class="control is-expanded">
                            <input v-model="max" class="input" type="number" placeholder="Default: 1" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="field is-horizontal">
                <div class="field-label">
                    <label class="label">Separator: </label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <div class="control is-expanded">
                            <input v-model="separator" class="input" type="text" placeholder="Default: ," />
                        </div>
                    </div>
                </div>
            </div>

            <button v-on:click="onSave" class="button is-success">
                <span class="icon"><i class="fas fa-save"></i></span>
                <span>Save</span>
            </button>
            <button v-on:click="$emit('screen-change', 'upload')" class="button is-danger">
                <span class="icon"><i class="fas fa-trash"></i></span>
                <span>Discard</span>
            </button>
        </div>
    `
};

Vue.component("settings-screen", settingsScreen);