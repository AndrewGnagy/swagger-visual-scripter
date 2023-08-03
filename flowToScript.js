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
      headers: {
        'api-key': null
      }
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
    if (document.getElementById('apiKey').value) {
      makeRequestString = makeRequestString.replace(
        'null',
        document.getElementById('apiKey').value
      );
    }
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
    blockUrl = block['data'][2].value.substring(baseUrl.lastIndexOf(':') + 3);
    requestString += `resp = await makeRequest("${blockUrl.replace(
      /\/$/,
      ''
    )}", ${JSON.stringify(block['data'][0].value)},"`;
    requestString += JSON.stringify(block['data'][1].value);
    props = chartProperties[id]['properties'];
    let queryArr = [];
    let bodyString = '';
    for (prop of props) {
      if (prop.value == undefined) {
        continue;
      }
      if (prop.in == 'path') {
        requestString = requestString.replace(
          `{${prop.name}}`,
          `${prop.value}`
        );
      } else if (prop.in == 'query') {
        queryArr.push(`${prop.name}=${prop.value}`);
      } else if (prop.in == 'body') {
        bodyString += `, ${prop.value}`;
      }
    }
    if (queryArr[0]) {
      requestString = requestString.substring(0, requestString.length - 1);
      requestString += '?' + queryArr.join('&') + '"';
    }
    requestString += bodyString;
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
    } else if (block['data'][0].value == 'set') {
      requestString += `let ${paramValue} = ${chartProperties[id]['properties'][1].value};`;
    }
  }

  requestString += '\n';

  for (let i = startI; i < children.length; i++) {
    evaluateBlock(children[i].id);
  }
  requestString = requestString.replace('""', '"');
}
