const aboutScreen = {
    template:  `
        <div class="screen-container">
            <h1 class="title">About</h1>
            <hr class="hr" />
            <p>Threshy is designed to help developers select a decision threshold when using intelligent web services.<p/>
            <br />
             <p>We define an intelligent web service as any service that returns the result of a machine learning algorithm with a confidence value e.g. Google Cloud's Vision API. Developers must evaluate an intelligent web service with data from their <b>problem domain</b> and consider other factors such as cost when deciding to use a service. Threshy guides developers through this process.</p>
            <br />
            <p>Thresy was developed at the Applied Artificial Intelligence Institute at Deakin University. </p>
        </div>
    `
}

Vue.component('about-screen', aboutScreen);
