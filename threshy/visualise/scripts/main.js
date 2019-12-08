function populateNDimArray(matrix, value) {
    const cols = matrix[0].length;
    const rows = matrix.length;

    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            matrix[i][j] = value;
        }
    }
    
    return matrix;
}

function createNDimArray(dimensions) {
    if (dimensions.length > 0) {
        var dim = dimensions[0];
        var rest = dimensions.slice(1);
        var newArray = new Array();
        for (var i = 0; i < dim; i++) {
            newArray[i] = createNDimArray(rest);
        }
        return newArray;
    } 
    else {
        return undefined;
    }
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}

var app = new Vue({
    el: "#app",
    data: {
        selectedScreen: "upload",
        uploadScreenData: {
            selectedFile: null,
            selectedProblem: 0,
            hasError: false,
            errorMsg: null,
            settingsData: {
                idColumn: "id",
                truthColumn: "ground_truth",
                probabilityColumn: null,
                rejectLabel: "REJECT",
                targetLabel: null,
                min: "0",
                max: "1",
                separator: ","
            },
            results: null
        },
        visualiseScreenData: {
            results: null
        },
        costScreenData: null,
        optimiseScreenData: null
    },
    methods: {
        onChangeScreen: function(screen) {
            this.selectedScreen = screen;
        }
    }
});
