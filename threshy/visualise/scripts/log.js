const log = {
    props: {
        name: {
            type: String,
            default: function() {
                return "log-output"
            }
        },
        value: Array
    },
    methods: {
        writeLog: function(level, message) {
            const now = new Date().toISOString();
            const logs = this.value;
           
            // Push new log into data model
            logs.push(now + " - " + level + " - " + message);
            this.$emit('input', logs);

            this.$nextTick(function() {
                const logOutput = document.getElementById(this.name);
                if (logOutput != null)
                    logOutput.scrollTop = logOutput.scrollHeight;
            });
        }
    },
    template: `
        <div :id="name" class="log-output">
            <span class="log" v-for="log in value">{{ log }}</span>
        </div>
    `
};

Vue.component('log', log);