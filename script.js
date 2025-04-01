var defaultJSONinput = `{
  "orders": [
    {
      "id": 1,
      "customer": "John Doe",
      "items": [
        {
          "name": "Laptop",
          "price": 1200
        },
        {
          "name": "Mouse",
          "price": 25
        }
      ]
    },
    {
      "id": 2,
      "customer": "Jane Smith - diff",
      "items": [
        {
          "name": "Keyboard",
          "price": 100
        }
      ]
    }
  ]
}`;

var defaultJSONoutput = `[
  {
    "name": "Laptop - diff",
    "details": {
      "price": 1200,
      "orderId": "1",
      "customer": "John Doe"
    }
  },
  {
    "name": "Mouse",
    "details": {
      "price": 25,
      "orderId": "1",
      "customer": "John Doe"
    }
  },
  {
    "name": "Keyboard",
    "details": {
      "price": 100,
      "orderId": "2",
      "customer": "Jane Smith"
    }
  }
]`;

var defaultJSONata = `**.items.{
  "name": name,
  "details": {
    "price": price,
    "orderId": $string(%.id),
    "customer": %.customer
  }
}`

// Initialize data structure to hold input/output pairs
const inputOutputPairs = [
    { input: defaultJSONinput, output: JSON.parse(JSON.stringify(defaultJSONoutput)) }, // Deep copy
    { input: "", output: "" },
    { input: "", output: "" },
    { input: "", output: "" },
    { input: "", output: "" },
    { input: "", output: "" },
    { input: "", output: "" },
    { input: "", output: "" },
    { input: "", output: "" },
    { input: "", output: "" }
];

let currentPairIndex = 0; // Track the currently selected pair

async function runTransformation() {
    const inputCode = inputCodeEditor.getValue();
    const transformationCode = transformationCodeEditor.getValue();
    const desiredOutputCode = desiredCodeEditor.getValue();
    const diffContainer = document.getElementById('diff');

    // Save current pair's content
    //inputOutputPairs[currentPairIndex].input = inputCode;
    //inputOutputPairs[currentPairIndex].output = desiredOutputCode;

    try {
        const parsedData = JSON.parse(inputCode);
        const expression = jsonata(transformationCode);
        const transformedInpudCode = await expression.evaluate(parsedData);
        const output = JSON.stringify(transformedInpudCode, null, 2);

        generatedOutputCodeEditor.setValue(output);

        // Calculate diff
        const diff = generateDiff(output, desiredOutputCode);
        diffContainer.innerHTML = diff;

    } catch (error) {
        generatedOutputCodeEditor.setValue('Error: ' + error.message);
        diffContainer.innerHTML = "";
    }
}

function generateDiff(output, desired) {
    if (typeof Diff2Html !== 'undefined' && typeof Diff !== 'undefined') {
        const diffInput = Diff.createPatch("Post-JSONata Output", output, desired);
        const diffJson = Diff2Html.parse(diffInput);
        const diffHtml = Diff2Html.html(
            diffJson,
            {
                drawFileList: true,
                matching: 'lines',
                outputFormat: 'side-by-side',
                synchronisedScroll: true,
                highlight: true,
                renderNothingWhenEmpty: false
            }
        );
        return diffHtml;
    } else {
        return "Diff library not loaded.";
    }
}

// Initialize all editors and run runTransformation() on window load
window.addEventListener('load', function () {
    require.config({
        paths: {
            'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.29.1/min/vs'
        }
    });

    require(['vs/editor/editor.main'], function () {
        // Initialize editors

        inputCodeEditor = monaco.editor.create(document.getElementById('editor-container-input'), {
            value: inputOutputPairs[0].input, // Load initial input
            language: 'json',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false }
        });
        inputCodeEditor.onDidChangeModelContent(runTransformation);

        transformationCodeEditor = monaco.editor.create(document.getElementById('editor-container-transformation-code-input'), {
            value: defaultJSONata,
            language: 'jsonata',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false }
        });
        transformationCodeEditor.onDidChangeModelContent(runTransformation);

        generatedOutputCodeEditor = monaco.editor.create(document.getElementById('editor-container-generated-output'), {
            language: 'json',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            readOnly: true
        });

        desiredCodeEditor = monaco.editor.create(document.getElementById('editor-container-desired-output'), {
            value: JSON.stringify(JSON.parse(defaultJSONoutput), null, 2), // Deep copy for initial load
            language: 'json',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false }
        });
        desiredCodeEditor.onDidChangeModelContent(runTransformation);
    });

    setTimeout(() => {
        if (typeof jsonata === 'undefined') {
            console.error('JSONata library not loaded.');
            desiredCodeEditor.setValue("Error: JSONata Library Not Loaded.");
            document.getElementById('diff').innerHTML = "";
        } else {
            runTransformation();
        }
    }, "500");

    // PAIR SELECTOR
    document.getElementById('pair').addEventListener('change', function () {
        // Save the content of the current pair
        inputOutputPairs[currentPairIndex].input = inputCodeEditor.getValue();
        inputOutputPairs[currentPairIndex].output = desiredCodeEditor.getValue();

        currentPairIndex = parseInt(this.value); // Update current pair index
        // Load the content of the selected pair
        inputCodeEditor.setValue(inputOutputPairs[currentPairIndex].input);
        desiredCodeEditor.setValue(inputOutputPairs[currentPairIndex].output);
        runTransformation();
    });

    // SAVE TEMPLATE
    document.getElementById('saveTemplate').addEventListener('click', function () {
        const template = {
            inputOutputPairs: inputOutputPairs,  // Save all pairs
            transformationCode: transformationCodeEditor.getValue()
        };

        const json = JSON.stringify(template, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jsonata-project-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // APPLY TEMPLATE
    document.getElementById('applyTemplate').addEventListener('click', function () {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const template = JSON.parse(e.target.result);
                    if (template.inputOutputPairs) {
                        template.inputOutputPairs.forEach((pair, index) => {
                            inputOutputPairs[index] = pair || { input: "", output: "" }; // Ensure pair is not undefined
                            inputOutputPairs[index].input = inputOutputPairs[index].input || "";
                            inputOutputPairs[index].output = inputOutputPairs[index].output || "";
                        });
                        transformationCodeEditor.setValue(template.transformationCode || "");
                        // Load the first pair
                        currentPairIndex = 0;
                        document.getElementById('pair').value = "0";
                        inputCodeEditor.setValue(inputOutputPairs[0].input);
                        desiredCodeEditor.setValue(inputOutputPairs[0].output);
                        runTransformation();
                    } else {
                        alert('Invalid template format. Missing inputOutputPairs.');
                    }


                } catch (error) {
                    alert('Error parsing JSON file: ' + error.message);
                }
            };
            reader.readAsText(file);
        };

        input.click();
    });
});

// Change layout when user switches it
document.getElementById('layout').addEventListener('change', function () {
    const layout = this.value;
    const container = document.querySelector('.container');

    if (layout === 'row') {
        container.classList.add('row-layout');
    } else {
        container.classList.remove('row-layout');
    };

    runTransformation()
});