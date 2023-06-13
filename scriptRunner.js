let flowVariables = {};
let baseUrl = "https://nuthatch.lastelm.software";

function executeScript() {
    //Start with root block
    //Kicks off depth-first tree traversal
    executeBlock(0);
}

function executeBlock(id) {
    let block = getBlock(id);
    //If it's an API block, do a thing
    if (getDataProperty(block["data"], "method")) {
        executeApiBlock(block);
    } else if (getDataProperty(block["data"], "logic")) { //Handle if or for blocks
        console.log("Logic");
    }

    let children = getChildBlocks(id);
    for(let i = 0; i < children.length; i++) {
        executeBlock(children[i].id);
    }
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
    chartProperties[block.id].properties.forEach(property => {
        if(property.in && property.in == "query") {
            let separator = path.indexOf("?") == -1 ? "?" : "&";
            path += separator + property.value;
        } else if(property.in && property.in == "path") {
            path = path.replace(`{${property.name}}`, property.value);
        }
    });
    console.log("Making " + method + " request to: " + path);
    //TODO uncomment when complete
    makeRequest(method, path, data);
    flowVariables['lastResult'] = {}
}

function resolveVariable(myvar) {
    // myvar.split(".").reduce(o, k => {
    //  //Something to account for []
    //   return o && o[k];
    // }, flowVariables);
}

let makeRequest = async (method, path, data) => {
    return await new Promise((resolve, reject) => {
      let httpRequest = new XMLHttpRequest();
      httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState == 4 && httpRequest.status == 200) {
          console.log("responseText:" + httpRequest.responseText);
          try {
            if(httpRequest.responseText) {
              resolve(JSON.parse(httpRequest.responseText));
            } else {
              resolve();
            }
          } catch (err) {
            reject(Error(err.message + " in " + httpRequest.responseText, err));
          }
        } else if (httpRequest.readyState == 4) {
          reject("Request returned status code" + httpRequest.status);
        }
      };
      httpRequest.onerror = () => {
        reject(Error("There was a network error."));
      };
      httpRequest.open(method, baseUrl + path);
      httpRequest.setRequestHeader("Content-Type", "application/json");
      httpRequest.setRequestHeader("api-key", "130eff77-4b97-41d2-9198-d8e52e5dc96c");
      httpRequest.send(data);
    });
  };