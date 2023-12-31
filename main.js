/**
 * {
 *  flowyId: {
 *      path: "",
 *      properties: []
 *  }
 * }
 */
let chartProperties = {};
let PACKAGED;

document.addEventListener('DOMContentLoaded', function () {
  let swaggerJson;
  var rightcard = false;
  var tempblock;
  var tempblock2;
  var blockLists = {
    active: 'api',
    api: [],
    logic: [
      generateBlock('IF', 'if block', undefined, [
        {
          name: 'logic',
          value: 'if',
        },
      ]),
      generateBlock('FOR', 'for block', undefined, [
        {
          name: 'logic',
          value: 'for',
        },
      ]),
      generateBlock(
        'Set Variable',
        'Set a value as a variable',
        './assets/log.svg',
        [
          {
            name: 'logic',
            value: 'set',
          },
        ]
      ),
    ],
    loggers: [
      generateBlock('Add log', 'Logs a given input', './assets/log.svg', [
        {
          name: 'logic',
          value: 'log',
        },
      ]),
    ],
  };
  flowy(document.getElementById('canvas'), drag, release, snapping, rearrange);

  function snapping(block, first, parent) {
    //Element can be modified here
    let specialBlockCheck = block.querySelector('[name="logic"]');
    let blockId = parseInt(block.querySelector('.blockid').value);
    chartProperties[blockId] = {};
    if (specialBlockCheck && specialBlockCheck.value == 'if') {
      //This seems hacky???
      setTimeout(function () {
        flowy.addBlock(
          new DOMParser().parseFromString(
            generateBlock('True', 'executes if true'),
            'text/html'
          ).body.childNodes[0],
          blockId
        );
        flowy.addBlock(
          new DOMParser().parseFromString(
            generateBlock('False', 'executes if false'),
            'text/html'
          ).body.childNodes[0],
          blockId
        );
      }, 250);
    }

    //Don't allow multiple children to be attached to the same block
    if (first) {
      return true;
    }
    let parentId = parseInt(parent.querySelector('.blockid').value);
    //Highlight FOR loop and child
    let forBlockCheck = parent.querySelector('[name="logic"]');
    if (forBlockCheck && forBlockCheck.value == 'for') {
      block.classList.add('forhighlight');
      parent.classList.add('forhighlight');
    }
    return getChildBlocks(parentId, flowy.output()).length == 0;
  }
  function rearrange(block, parent) {
    return true;
  }
  function drag(block) {
    block.classList.add('blockdisabled');
    tempblock2 = block;
  }
  function release() {
    if (tempblock2) {
      tempblock2.classList.remove('blockdisabled');
    }
  }

  let closePropertiesPanel = function () {
    if (rightcard) {
      rightcard = false;
      document.getElementById('properties').classList.remove('expanded');
      setTimeout(function () {
        document.getElementById('propwrap').classList.remove('itson');
      }, 300);
      tempblock.classList.remove('selectedblock');
    }
  };
  function addEventListenerMulti(type, listener, capture, selector) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener(type, listener, capture);
    }
  }
  //Block Nav
  var blockNavClick = function () {
    document.querySelector('.navactive').classList.add('navdisabled');
    document.querySelector('.navactive').classList.remove('navactive');
    this.classList.add('navactive');
    this.classList.remove('navdisabled');

    switchActiveBlockList(this.getAttribute('id'));
  };
  addEventListenerMulti('click', blockNavClick, false, '.side');
  //Right menu
  document
    .getElementById('propertiesClose')
    .addEventListener('click', function () {
      closePropertiesPanel();
    });
  //Delete buttons
  document.getElementById('removeblock').addEventListener('click', function () {
    chartPropertiesKeys = Object.keys(chartProperties);

    if (chartPropertiesKeys.includes(flowy.getActiveBlockId())) {
      flowy.deleteBranch(flowy.getActiveBlockId());
      chartPropertiesKeys.forEach((key) => {
        if (!getBlock(key)) {
          delete chartProperties[key];
        }
      });
    }
    closePropertiesPanel();
  });

  //Block click events
  var aclick = false;
  var noinfo = false;
  var beginTouch = function (event) {
    aclick = true;
    noinfo = false;
    if (event.target.closest('.create-flowy')) {
      noinfo = true;
    }
  };
  var checkTouch = function (event) {
    aclick = false;
  };

  var doneTouch = function (event) {
    if (event.type === 'mouseup' && aclick && !noinfo) {
      document
        .querySelectorAll('.selectedblock')
        .forEach((el) => el.classList.remove('selectedblock'));
      let blockEl = event.target.closest('.block');
      let blockId = flowy.getActiveBlockId();
      if (blockEl && !blockEl.classList.contains('dragging')) {
        if (chartProperties[blockId]) {
          if (Object.keys(chartProperties[blockId]).length == 0) {
            flowyBlock = getBlock(blockId);
            let method = getDataProperty(flowyBlock['data'], 'method');
            let path = getDataProperty(flowyBlock['data'], 'path');
            let logic = getDataProperty(flowyBlock['data'], 'logic');

            //Properties for Swagger methods
            if (method) {
              //Set chartProperties to match block
              Object.keys(swaggerJson.paths).forEach((swaggerPath) => {
                if (swaggerPath == path) {
                  pathMethods = Object.keys(swaggerJson.paths[swaggerPath]);
                  pathMethods.forEach((pathMethod) => {
                    if (pathMethod == method) {
                      chartProperties[blockId] = {
                        path: method + ' ' + path,
                        properties:
                          swaggerJson.paths[swaggerPath][pathMethod]
                            .parameters || [],
                      };
                      if (
                        swaggerJson.paths[swaggerPath][pathMethod].requestBody
                      ) {
                        let examples =
                          swaggerJson.paths[swaggerPath][pathMethod].requestBody
                            .content?.['application/json']?.examples;
                        chartProperties[blockId].properties.push({
                          name: 'Body',
                          description: 'Request body',
                          required: 'true',
                          in: 'body',
                          schema: {
                            type: 'json',
                          },
                          examples:
                            examples && Object.keys(examples).length > 0
                              ? examples[Object.keys(examples)[0]]?.value
                              : '{}',
                        });
                      }
                    }
                  });
                }
              });
            } else if (logic && logic != 'set') {
              //Properties for if and for
              chartProperties[blockId] = {
                logic: logic,
                properties: [
                  {
                    name: 'expression',
                    description: 'what to evaluate',
                    required: 'true',
                    schema: {
                      type: 'string',
                    },
                  },
                ],
              };
            } else if (logic && logic === 'set') {
              //Properties for set
              chartProperties[blockId] = {
                logic: logic,
                properties: [
                  {
                    name: 'VariableName',
                    description: 'name of variable to set',
                    required: 'true',
                    schema: {
                      type: 'string',
                    },
                  },
                  {
                    name: 'VariableValue',
                    description: 'value to set on the variable',
                    required: 'true',
                    schema: {
                      type: 'string',
                    },
                  },
                ],
              };
            } else {
              chartProperties[blockId] = {
                properties: [],
              };
            }
          }

          document.getElementById('parameterinputs').innerHTML = '';
          //Add properties to the right card
          chartProperties[blockId].properties.forEach((property) => {
            // render the name first and with unique formatting from the rest of the data
            document
              .getElementById('parameterinputs')
              .insertAdjacentHTML(
                'beforeend',
                `<h3 class="propheader">Name: ${property.name}</h3>`
              );

            // Populate the property text fields
            Object.keys(property).forEach((propertyKey) => {
              if (propertyKey == 'schema') {
                document
                  .getElementById('parameterinputs')
                  .insertAdjacentHTML(
                    'beforeend',
                    `<p class="propdata">${propertyKey.toUpperCase()}: ${JSON.stringify(
                      property[propertyKey]
                    )}</p>`
                  );
              } else if (propertyKey != 'name' && propertyKey != 'value') {
                document
                  .getElementById('parameterinputs')
                  .insertAdjacentHTML(
                    'beforeend',
                    `<p class="propdata">${propertyKey.toUpperCase()}: ${
                      property[propertyKey]
                    }</p>`
                  );
              }
            });

            // Populate the input fields
            if (property.schema != null) {
              let propertyType = property.schema.type; // Might be null if property.schema.enum
              let htmlToAdd;
              if (property.schema.enum) {
                let options = property.schema.enum.map(
                  (val) => `<option value="${val}">${val}</option>`
                );
                htmlToAdd = `<select class="dropme" data-id="${blockId} ${
                  property.name
                }">${options.join('\n')}</select>`;
              } else if (
                propertyType == 'string' ||
                propertyType == 'integer'
              ) {
                htmlToAdd = `<input class="propinput" type="text" data-id="${blockId} ${property.name}">`;
              } else if (propertyType == 'boolean') {
                htmlToAdd = `<input type="checkbox" data-id="${blockId} ${property.name}">`;
              } else if (propertyType == 'json') {
                flowyBlock = getBlock(blockId);
                let callPath = getDataProperty(flowyBlock['data'], 'path');
                let callType = getDataProperty(flowyBlock['data'], 'method');
                htmlToAdd = `<textarea data-id="${blockId} ${
                  property.name
                }">${getModel(callPath, callType)}`;
              }
              let parser = new DOMParser();
              let propertyElement = parser.parseFromString(
                htmlToAdd,
                'text/html'
              ).body.childNodes[0];
              if (property.value) {
                if (
                  property.schema.enum ||
                  propertyType == 'string' ||
                  propertyType == 'integer' ||
                  propertyType == 'json'
                ) {
                  propertyElement.value = property.value;
                } else if (propertyType == 'boolean') {
                  propertyElement.checked = property.value;
                }
              }
              document
                .getElementById('parameterinputs')
                .insertAdjacentElement('beforeend', propertyElement);
              document
                .querySelector(`[data-id='${blockId} ${property.name}']`)
                .addEventListener('change', (event) =>
                  propertyChanged(event, blockId, property.name)
                );
            }
          });
        }

        //Pop the right card and highlight the block
        tempblock = event.target.closest('.block');
        rightcard = true;
        document.getElementById('properties').classList.add('expanded');
        document.getElementById('propwrap').classList.add('itson');
        tempblock.classList.add('selectedblock');
      }
    }
  };

  //get the basic model of a specific api request
  function getModel(callPath, callType) {
    let refPath;
    refPath =
      swaggerJson.paths[callPath][callType].requestBody.content[
        'application/json'
      ]?.schema['$ref'];
    if (refPath != undefined) {
      refPath = refPath.substring(refPath.lastIndexOf('/') + 1);
      jsonSchema = swaggerJson.components.schemas[refPath].properties;
      let text = '{\n';
      jsonProps = Object.keys(jsonSchema).forEach((prop) => {
        let propType = JSON.stringify(jsonSchema[prop]);
        let typeText = ' : ';
        if (propType.includes('array')) {
          typeText += '[]';
        } else if (propType.includes('string')) {
          typeText += '""';
        } else if (
          propType.includes('number') ||
          propType.includes('integer')
        ) {
          typeText += '0';
        } else if (prop.includes('boolean')) {
          typeText += 'false';
        } else {
          typeText += '{}';
        }
        typeText += ', \n';
        text += '  ' + prop + typeText;
      });
      text += '}';
      return text;
    } else {
      return '';
    }
  }

  function propertyChanged(event, blockId, propertyName) {
    let value;
    if (event.target.type == 'checkbox') {
      value = event.currentTarget.checked;
    } else {
      value = event.target.value;
    }

    let properties = chartProperties[blockId].properties;
    for (let i = 0; i < properties.length; i++) {
      if (properties[i].name == propertyName) {
        properties[i].value = value;
        break;
      }
    }
  }

  //function to merge objects and their properties
  let deepMerge = (obj1, obj2) => {
    let target = { ...obj1, ...obj2 };
    if (obj1 && obj2) {
      for (let propkey in target) {
        if (typeof target[propkey] == 'object' && target[propkey] !== null) {
          target[propkey] = deepMerge(obj1[propkey], obj2[propkey]);
        }
      }
    }
    return target;
  };

  //imports a new api
  let processImportJson = function (fileJson) {
    let fileJsonKeys = Object.keys(fileJson);
    if (
      fileJsonKeys.includes('swaggerJson') ||
      fileJsonKeys.includes('flowyOutput') ||
      fileJsonKeys.includes('chartProperties')
    ) {
      // We are importing a previously Exported flow chart
      if (fileJsonKeys.includes('swaggerJson'))
        swaggerJson = deepMerge(swaggerJson, fileJson.swaggerJson);
      if (fileJson.swaggerJson?.servers[0]) {
        baseUrl = fileJson.swaggerJson.servers[0].url;
        document.querySelector('#baseUrl').value = baseUrl;
      }
      if (fileJsonKeys.includes('flowyOutput'))
        flowy.import(fileJson.flowyOutput); // TODO: This is unsafe!
      if (fileJsonKeys.includes('chartProperties'))
        chartProperties = fileJson.chartProperties;
      populateBlocks();
      return;
    }

    //TODO do better input validation
    if (fileJson.info) {
      if (fileJson.servers && fileJson.servers.length > 0) {
        baseUrl = fileJson.servers[0].url;
        document.querySelector('#baseUrl').value = baseUrl;
      }

      document.getElementById('swaggerName').innerHTML =
        fileJson?.info?.title || '';
      document.getElementById('swaggerVersion').innerHTML = fileJson?.info
        ?.version
        ? `${fileJson?.info?.version}`
        : '';
      if (
        fileJsonKeys.includes('swagger') ||
        (fileJsonKeys.includes('openapi') &&
          parseInt(fileJson['openapi'].charAt(0)) < 3)
      ) {
        // Swagger JSON is outdated.  Convert to openAPI V3 standard
        convertV2ToV3(fileJson).then((result) => {
          swaggerJson = deepMerge(swaggerJson, result);
          populateBlocks();
        });
      } else if (!fileJsonKeys.includes('openapi')) {
        // The first line in a valid Swagger JSON file should be the version (i.e. swagger or openapi)
        throw new Error('Not a real swagger json file?');
      } else {
        // The provided Swagger JSON is good as-is
        swaggerJson = deepMerge(swaggerJson, fileJson);
        populateBlocks();
      }
    } else {
      throw new Error('Not a real swagger json file?');
    }
  };

  let importSwagger = function (event) {
    var reader = new FileReader();

    reader.onload = function (event) {
      try {
        let fileJson = JSON.parse(event.target.result);
        processImportJson(fileJson);
      } catch (e) {
        //TODO
        console.log('Error reading swagger json');
        console.error(e);
      }
    };
    reader.readAsText(event.target.files[0]);
  };

  let populateBlocks = function () {
    //clear prevoius blocklist so we dont duplicate
    blockLists['api'] = [];

    apiPaths = Object.keys(swaggerJson.paths);
    for (let i = 0; i < apiPaths.length; i++) {
      let path = apiPaths[i];
      //Build a block for each path
      pathMethods = Object.keys(swaggerJson.paths[path]);
      //TODO null check as appropriate
      for (let j = 0; j < pathMethods.length; j++) {
        let pathMethod = pathMethods[j];
        if (pathMethod == 'servers') {
          continue;
        }
        let blockHtml = generateBlock(
          pathMethod + ' ' + path,
          swaggerJson.paths[path][pathMethod]['summary'] ||
            swaggerJson.paths[path][pathMethod]['description'],
          './assets/arrow.svg',
          [
            {
              name: 'method',
              value: pathMethod,
            },
            {
              name: 'path',
              value: path,
            },
            {
              name: 'url',
              value: baseUrl,
            },
          ]
        );
        addBlockToBlockList('api', blockHtml);
      }
    }
  };
  addEventListener('mousedown', beginTouch, false);
  addEventListener('mousemove', checkTouch, false);
  addEventListener('mouseup', doneTouch, false);
  addEventListenerMulti('touchstart', beginTouch, false, '.block');

  // Utility functions
  function switchActiveBlockList(id) {
    blockLists.active = id;
    document.getElementById('blocklist').innerHTML = blockLists[id].join('\n');
  }

  //id = which blocklist to add block to. api, logic, loggers
  function addBlockToBlockList(id, htmlToAdd) {
    blockLists[id].push(htmlToAdd);
    if (blockLists.active == id) {
      document.getElementById('blocklist').innerHTML =
        blockLists[id].join('\n');
    }
  }

  function generateBlock(
    title,
    description = '-',
    iconPath = './assets/action.svg',
    data = []
  ) {
    let dataFields = data.map(
      (d) =>
        `<input type="hidden" name="${d.name}" class="${d.name}" value="${d.value}"></input>`
    );
    return `<div class="blockelem create-flowy noselect blockroot">${dataFields.join(
      '\n'
    )}<div class="grabme"><img src="${
      PACKAGED ? 'https://storage.googleapis.com/lastelm-static/' : ''
    }assets/grabme.svg"></div><div class="blockin"><div class="blockico"><span></span><img src="${
      PACKAGED ? 'https://storage.googleapis.com/lastelm-static/' : ''
    }${iconPath}"></div><div class="blocktext"><p class="blocktitle ${
      title.split(' ')[0]
    }">${title}</p><p class="blockdesc">${description}</p></div></div></div>`;
  }

  function filterBlocks(event) {
    let filter = event.target.value;
    let activeBl = blockLists[blockLists.active];
    document.getElementById('blocklist').innerHTML = activeBl.filter((b) => {
      let parser = new DOMParser();
      let title = parser
        .parseFromString(b, 'text/html')
        .querySelector('.blocktitle');
      return title.innerHTML.toLowerCase().indexOf(filter.toLowerCase()) != -1;
    });
  }
  const searchInput = document.querySelector('#search input');
  searchInput.addEventListener('input', filterBlocks, false);

  const importBtn = document.querySelector('#importinput');
  importBtn.addEventListener('change', importSwagger, false);

  let runScript = function () {
    executeScript();
  };
  const runBtn = document.querySelector('#runscript');
  runBtn.addEventListener('click', runScript, false);

  // Settings Modal
  const settingsModal = document.querySelector('#settingsModal');

  let openSettingsModal = function () {
    settingsModal.style.display = 'block';
  };

  let closeSettingsModal = function () {
    settingsModal.style.display = 'none';
  };

  let updateBaseUrl = function (event) {
    baseUrl = event.target.value;
  };

  const settingsBtn = document.querySelector('#settingsBtn');
  settingsBtn.addEventListener('click', openSettingsModal, false);

  const settingsCloseBtn = document.querySelector('#settingsClose');
  settingsCloseBtn.addEventListener('click', closeSettingsModal, false);

  const baseUrlInput = document.querySelector('#baseUrl');
  baseUrlInput.addEventListener('input', updateBaseUrl, false);

  let setBaseUrlAtStartup = function () {
    let inputValue = baseUrlInput.value;
    if (inputValue !== undefined && inputValue !== null && inputValue !== '') {
      baseUrl = inputValue;
    } else {
      baseUrl = '';
    }
  };

  setBaseUrlAtStartup();

  let exportChart = function () {
    const saveJson = document.createElement('a');
    let flowyOutput = flowy.output();
    let outputData = JSON.stringify({
      swaggerJson: swaggerJson,
      flowyOutput: flowyOutput,
      chartProperties: chartProperties,
    });
    saveJson.href = URL.createObjectURL(
      new Blob([outputData], {
        type: 'application/json',
      })
    );
    saveJson.download = 'swaggerFlowChart.json';
    saveJson.click();
    setTimeout(() => URL.revokeObjectURL(saveJson.href), 60000);
  };

  const consoleCloseBtn = document.querySelector('#consoleClose');
  consoleCloseBtn.addEventListener('click', closeBottom, false);

  const exportBtn = document.querySelector('#export');
  exportBtn.addEventListener('click', exportChart, false);

  if (PACKAGED) {
    //If there's a swagger.json file in this directory, process it automatically
    fetch('./swagger.json')
      .then((result) => result.json())
      .then(processImportJson);
  }

  let runJsScript = function () {
    createScript(chartProperties);
    document.getElementById('jslabel').innerHTML = requestString;
    document.getElementById('jstext').innerHTML = makeRequestString;
  };

  //show javascript button and modal funtions
  const jsModal = document.querySelector('#jsModal');
  const showJsBtn = document.querySelector('#jsdisplay');
  const jsCloseBtn = document.querySelector('#jsClose');
  const jsCopyBtn = document.querySelector('#jscopy');

  let closeJsModal = function () {
    jsModal.style.display = 'none';
  };
  let openJsModal = function () {
    jsModal.style.display = 'block';
    document.getElementById('jscopy').innerHTML =
      '<i class="bi bi-clipboard2"></i>';
    runJsScript();
  };
  let copyScript = function () {
    navigator.clipboard.writeText(requestString + makeRequestString);
    document.getElementById('jscopy').innerHTML =
      '<i class="bi bi-clipboard2-check"></i>';
  };

  showJsBtn.addEventListener('click', openJsModal, false);
  jsCopyBtn.addEventListener('click', copyScript, false);
  jsCloseBtn.addEventListener('click', closeJsModal, false);
});

function openBottom() {
  document.getElementById('bottomcard').style.height = '280px';
}

function closeBottom() {
  document.getElementById('bottomcard').style.height = '0px';
}
