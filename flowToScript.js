//Build a js script based on the flow. How hard could it be?
let requestString;
let makeRequestString;
function createScript(chartProperties) {
  //Start with root block
  //Kicks off depth-first tree traversal
  chartProperties = chartProperties;
  requestString = 'let resp; \n let requestBlock = async () => { \n';

  if (baseUrl != '') {
    makeRequestString = `let makeRequest = async (baseUrl, method, path, data) => {
    const https = require("node:${baseUrl.substring(
      0,
      baseUrl.lastIndexOf(':')
    )}");
    let response;
    const options = {
      hostname: baseUrl,
      path: path,
      method: method,
      data: data,
    };
  
    const req = https.request(options, (res) => {
      console.log("statusCode:", res.statusCode);
      console.log("headers:", res.headers);
      response = res;
      res.on("data", (data) => {
        process.stdout.write(data);
      });
    });
  
    req.on("error", (e) => {
      console.error(e);
    });
    req.end();
    return response;
    };
    requestBlock();`;
  } else {
    makeRequestString = 'Base URL not found. Try importing a swagger file.';
  }
  try {
    evaluateBlock(0);
    requestString += '}; \n';
  } catch {
    requestString = 'Script not found. Try adding blocks or parameters.';
  }
}

function evaluateBlock(id) {
  let block = getBlock(id);
  let children = getChildBlocks(id);
  let startI = 0;
  //If it's an API block, do a thing
  if (getDataProperty(block['data'], 'method')) {
    requestString += `resp = await makeRequest("${baseUrl.substring(
      baseUrl.lastIndexOf('/') + 1
    )}", ${JSON.stringify(block['data'][0].value)}, ${JSON.stringify(
      block['data'][1].value
    )}`;
    props = chartProperties[id]['properties'];
    for (prop of props) {
      if (prop.in == 'path') {
        requestString[requestString.length - 1] = '?';
        requestString += `path=${prop.value}"`;
      } else if (prop.in == 'query') {
        requestString += `, {${prop.name}: "${prop.value}" }`;
      } else if (prop.in == 'body') {
        requestString += `, ${prop.value}`;
      }
    }
    requestString += ');';
  } else if (getDataProperty(block['data'], 'logic')) {
    paramValue = chartProperties[id]['properties'][0].value;
    if (block['data'][0].value == 'if') {
      requestString += `if(${paramValue}){`;
      id++;
      evaluateBlock(id);
      requestString += `}else{`;
      id++;
      evaluateBlock(id);
      requestString += `}`;
      startI += 2;
    } else if (block['data'][0].value == 'for') {
      requestString += `for(${paramValue}){`;
      id++;
      evaluateBlock(id);
      requestString += `}`;
      startI++;
    } else if (block['data'][0].value == 'log') {
      requestString += `console.log(${paramValue});`;
    }
  }

  requestString += '\n';
  for (let i = startI; i < children.length; i++) {
    evaluateBlock(children[i].id);
  }
}
