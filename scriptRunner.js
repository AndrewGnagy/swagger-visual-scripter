let flowVariables = {};
let baseUrl;

function executeScript() {
    //Start with root block
    //Kicks off depth-first tree traversal
    if (baseUrl === undefined && baseUrl === null && baseUrl !== "") {
      throw new Error("Invalid Base URL");
    }
    executeBlock(0);
    openBottom();
}

function executeBlock(id, iterableItems) {
    let block = getBlock(id);
    let children = getChildBlocks(id);
    if (iterableItems) { //Set var value for loop
        flowVariables["loopItem"] = iterableItems.pop();
    }
    try {
        //If it's an API block, do a thing
        if (getDataProperty(block["data"], "method")) {
            return executeApiBlock(block, iterableItems);
        } else if (getDataProperty(block["data"], "logic")) { //Handle if or for blocks
            let blockType = getDataProperty(block["data"], "logic");
            console.log(blockType);
            switch(blockType) {
                case "if":
                    let ifResult = processExpression(chartProperties[id].properties[0].value);
                    swagLog(`If result: ${!!expressionResult}`);
                    let trueFalseBlock = ifResult ? 0 : 1;
                    executeBlock(children[trueFalseBlock].id);
                    return;
                case "for":
                    let loopExpressionResult = processExpression(chartProperties[id].properties[0].value);
                    if(Array.isArray(loopExpressionResult)) {
                        executeBlock(children[0].id, loopExpressionResult);
                    } else {
                        throw new Error("For loop result was not iterable");
                    }
                    return;
                case "log":
                    swagLog(chartProperties[id].properties[0].value);
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
        swagLog(`Error running block: ${id}`);
        swagLog(e);
        return;
    }

    if(iterableItems != undefined && iterableItems.length > 0) {
        return executeBlock(block.id, iterableItems);
    }
    if(children.length > 0) {
        return executeBlock(children[0].id, iterableItems);
    }
}

function processExpression(expression) {
    //Replace variables with literals
    expression = expression.split(" ").map(symb => {
        if(symb.startsWith("$")) {
            let res = resolveVariable(symb);
            return JSON.stringify(res);
        }
        return symb;
    }).join(" ");
    // let expressionResult = Parser.evaluate(chartProperties[id].properties[0].value);
    return eval(expression);
}

function getBlock(id) {
    let chart = flowy.output();
    if(typeof id == "string") {
        id = parseInt(id);
    }
    if (!chart) {
      return undefined;
    } else {
      return chart.blocks.filter(b => {
          return b.id == id;
      })[0];
    }
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

function executeApiBlock(block, iterableItems) {
    console.log("Api");
    let method = getDataProperty(block["data"], "method");
    let path = getDataProperty(block["data"], "path");
    let data;
    //Get query and path properties
    if (chartProperties[block.id] !== undefined && chartProperties[block.id].properties !== undefined) {
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
            } else if(property.in && property.in == "body") {
                data = property.value;
            }
        });
    }
    swagLog("Making " + method + " request to: " + path);
    let httpRequest = new XMLHttpRequest();
    httpRequest.open(method, baseUrl + path);
    httpRequest.setRequestHeader("Content-Type", "application/json");
    let apiKey = document.getElementById("apiKey").value || "130eff77-4b97-41d2-9198-d8e52e5dc96c";
    httpRequest.setRequestHeader("api-key", apiKey);
    let authBearer = document.getElementById("authBearer").value;
    if (authBearer) {
        httpRequest.setRequestHeader("Authorization", authBearer);
    }
    makeRequest(httpRequest, data).then(result => {
        if(iterableItems != undefined) {
            flowVariables['loop'][iterableItems.length] = result;
            if(iterableItems.length > 0) {
                return executeBlock(block.id, iterableItems);
            }
        }
        flowVariables['lastResult'] = result;
        let children = getChildBlocks(block.id);
        if (children.length > 0) {
            executeBlock(children[0].id, iterableItems);
        }
    });
}

function resolveVariable(myvar) {
    myvar = myvar.replace("$", "");
    let result = undefined;
    try {
        result = myvar.split(".").reduce((o, k) => {
        //Something to account for []
        return o && o[k];
        }, flowVariables);
    } catch(e) {
        swagLog(`Var ${myvar} couldn't be found`);
        throw new Error(`Variable ${myvar} could not be resolved`);
    }
    return result;
}

let convertV2ToV3 = async (jsonToConvert) => {
    let url = "https://converter.swagger.io/api/convert";
    method = "POST";
    let data = JSON.stringify(jsonToConvert);

    console.log("Making " + method + " request to: " + url);

    let httpRequest = new XMLHttpRequest();
    httpRequest.open(method, url);
    httpRequest.setRequestHeader("Content-Type", "application/json");
    return makeRequest(httpRequest, data, false);
}

let makeRequest = async (httpRequest, data, doLog=true) => {
    return await new Promise((resolve, reject) => {
        httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState == 4 && httpRequest.status == 200) {
            if (doLog) {
                swagLog("responseText:" + httpRequest.responseText);
            }
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
            if (doLog) {
                swagLog("Error occured while making the request")
            }
            reject(Error("There was a network error."));
        };
        httpRequest.send(data);
    });
};

let swagLog = function(log) {
    console.log(log);
    if(log.startsWith("$")) {
        log = resolveVariable(log);
    }
    let logEntry = `<p>>> ${log}</p>`;
    document.querySelector("#consoleBody").insertAdjacentHTML("beforeend", logEntry);
}