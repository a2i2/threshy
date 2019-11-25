const slider = {
    props: {
        sliderLabel: String,
        eventData: {
            type: String,
            default: ""
        },
        value: {
            default: "0"
        }
    },
    template: `
        <div class="field is-horizontal">
            <div class="field-label" style="max-width: 200px; overflow: hidden;">
                <label class="label" :title="sliderLabel">{{ sliderLabel }}:</label>
            </div>
            <div class="field-body">
                <div class="field" style="padding-top: 5px">
                    <div class="control">
                        <input v-on:change="$emit('change', $event.target.value, eventData)" v-on:input="$emit('input', $event.target.value, eventData)" v-bind:value="value" type="range" min="0" max="1" step="0.01" class="slider">
                    </div>
                </div>
                <div class="field">
                    <div class="control">
                        <input class="input" type="text" style="width: 80px" v-bind:value="value" v-on:change="$emit('change', $event.target.value, eventData)" v-on:input="$emit('input', $event.target.value, eventData)" />
                    </div>
                </div>
            </div>
        </div>`
};

Vue.component("slider", slider);