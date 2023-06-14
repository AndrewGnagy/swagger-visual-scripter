let flowVariables = {};
let baseUrl = "https://nuthatch.lastelm.software/";

function executeScript() {
    //Start with root block
    //Kicks off depth-first tree traversal
    executeBlock(0);
    openBottom();
}

function executeBlock(id) {
    let block = getBlock(id);
    let children = getChildBlocks(id);
    //If it's an API block, do a thing
    try {
        if (getDataProperty(block["data"], "method")) {
            return executeApiBlock(block);
        } else if (getDataProperty(block["data"], "logic")) { //Handle if or for blocks
            let blockType = getDataProperty(block["data"], "logic");
            console.log(blockType);
            switch(blockType) {
                case "if":
                    let expressionResult = true; //TODO how to safely evaluate the expression? https://silentmatt.com/javascript-expression-evaluator/
                    let trueFalseBlock = expressionResult ? 0 : 1;
                    executeBlock(children[trueFalseBlock].id);
                    return;
                case "for":
                    // code block
                    break;
                case "log":
                    swagLog(chartProperties[id].properties.value);
                    break;
                default:
                    // code block
            }
        }
    } catch (e) {
        //Highlight block in error for 5sec
        let blockEl = document.querySelector(".blockid[value='" + id + "']").parentElement;
        blockEl.classList.add("errorblock");
        setTimeout(function () {
            blockEl.classList.remove("errorblock");
        }, 5000);
        console.log(`Error running block: ${id}`);
        console.log(e);
        return;
    }

    // for(let i = 0; i < children.length; i++) {
    //     executeBlock(children[i].id);
    // }
}

function getBlock(id) {
    let chart = flowy.output();
    if(typeof id == "string") {
        id = parseInt(id);
    }
    return chart.blocks.filter(b => {
        return b.id == id;
    })[0];
}

function getChildBlocks(parentId) {
    let chart = flowy.output();
    return chart.blocks.filter(b => {
        return b.parent == parentId;
    });
}

function getDataProperty(dataAry, name) {
    prop = dataAry.filter(d => d["name"] == name);
    return prop.length ? prop[0]["value"] : undefined;
}

function executeApiBlock(block) {
    console.log("Api");
    let method = getDataProperty(block["data"], "method");
    let path = getDataProperty(block["data"], "path");
    let data = undefined; //TODO gather params and such
    //Get query and path properties
    if (chartProperties[block.id] !== undefined && chartProperties[block.id] !== undefined) {
        chartProperties[block.id].properties.forEach(property => {
            let value = property.value;
            if(value == undefined) {
                return;
            } else if(typeof value == "string" && value.startsWith("$")){
                value = resolveVariable(value);
            }
            if(property.in && property.in == "query") {
                let separator = path.indexOf("?") == -1 ? "?" : "&";
                path += `${separator}${property.name}=${value}`;
            } else if(property.in && property.in == "path") {
                path = path.replace(`{${property.name}}`, value);
            }
        });
    }
    swagLog("Making " + method + " request to: " + path);
    let baseUrl = "https://nuthatch.lastelm.software";
    let httpRequest = new XMLHttpRequest();
    httpRequest.open(method, baseUrl + path);
    httpRequest.setRequestHeader("Content-Type", "application/json");
    httpRequest.setRequestHeader("api-key", "130eff77-4b97-41d2-9198-d8e52e5dc96c");
    makeRequest(httpRequest).then(result => {
        flowVariables['lastResult'] = result;
        let children = getChildBlocks(block.id);
        if (children.length > 0) {
            executeBlock(children[0].id);
        }
    });
}

function resolveVariable(myvar) {
    myvar = myvar.replace("$", "");
    let result = "";
    try {
        result = myvar.split(".").reduce((o, k) => {
        //Something to account for []
        return o && o[k];
        }, flowVariables);
    } catch(e) {
        console.log(`Var ${myvar} couldn't be found`);
        throw new Error(`Variable ${myvar} could not be resolved`);
    }
    return result;
}

let convertV2ToV3 = async (jsonToConvert) => {
    let url = "https://converter.swagger.io/api/convert"
    method = "POST"
    data = JSON.stringify(jsonToConvert)

    console.log("Making " + method + " request to: " + url);

    let httpRequest = new XMLHttpRequest();
    httpRequest.open(method, url);
    httpRequest.setRequestHeader("Content-Type", "application/json");
    return makeRequest(httpRequest)
}

let makeRequest = async (httpRequest) => {
    return await new Promise((resolve, reject) => {
        httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState == 4 && httpRequest.status == 200) {
            swagLog("responseText:" + httpRequest.responseText);
            try {
                flowVariables['lastStatus'] = httpRequest.status;
                if(httpRequest.responseText) {
                    resolve(JSON.parse(httpRequest.responseText));
                } else {
                    resolve();
                }
            } catch (err) {
            reject(Error(err.message + " in " + httpRequest.responseText, err));
            }
        } else if (httpRequest.readyState == 4) {
            reject("Request returned status code " + httpRequest.status);
        }
      };
      httpRequest.onerror = () => {
        reject(Error("There was a network error."));
      };
      httpRequest.send(data);
    });
};

let swagLog = function(log) {
    console.log(log);
    let logEntry = `<p>${log}</p>`;
    document.querySelector("#consoleBody").insertAdjacentHTML("beforeend", logEntry);
}