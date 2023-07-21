//Build a js script based on the flow. How hard could it be?
let requestString;

function createScript(chartProperties) {
  //Start with root block
  //Kicks off depth-first tree traversal
  chartProperties = chartProperties;
  requestString = '';
  evaluateBlock(0);
  return requestString;
}

function evaluateBlock(id) {
  let block = getBlock(id);
  //If it's an API block, do a thing
  if (getDataProperty(block['data'], 'method')) {
    requestString += `resp = await makeRequest(${JSON.stringify(
      block['data'][0].value
    )}, ${JSON.stringify(block['data'][1].value)}});`;
  } else if (getDataProperty(block['data'], 'logic')) {
    // if(if){
    //   requestString += `if (${}) {${}`
    // }else if(for){
    // }else if(set variable)
  }

  let children = getChildBlocks(id);
  for (let i = 0; i < children.length; i++) {
    evaluateBlock(children[i].id);
  }
}

let makeRequestString = `
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
  };`;
