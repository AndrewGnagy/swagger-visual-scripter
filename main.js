document.addEventListener("DOMContentLoaded", function () {
    let swaggerJson;
    var rightcard = false;
    var tempblock;
    var tempblock2;
    var blockLists = {
        active: "api",
        api: [],
        logic: [
            generateBlock("IF", "if block", undefined, [{ name: "logic", value: "if" }]),
            generateBlock("FOR", "for block", undefined, [{ name: "logic", value: "for" }])
        ],
        loggers: [
            generateBlock("Add log", "Logs a given input", undefined, [{ name: "logic", value: "log" }])
        ]
    };

    /**
     * {
     *  flowyId: {
     *      path: "",
     *      properties: []
     *  }
     * }
     */
    var chartProperties = {};

    flowy(document.getElementById("canvas"), drag, release, snapping, rearrange);
    function snapping(block, first, parent) {
        //Element can be modified here
        let specialBlockCheck = block.querySelector('[name="logic"]');
        if (specialBlockCheck && specialBlockCheck.value == "if") {
            let blockId = parseInt(block.querySelector(".blockid").value);
            //This seems hacky???
            setTimeout(function () {
                flowy.addBlock(
                    new DOMParser().parseFromString(generateBlock("True", "executes if true"), "text/html").body
                        .childNodes[0],
                    blockId
                );
                flowy.addBlock(
                    new DOMParser().parseFromString(generateBlock("False", "executes if false"), "text/html").body
                        .childNodes[0],
                    blockId
                );
            }, 250);
        }

        //Don't allow multiple children to be attached to the same block
        if (first) {
            return true;
        }
        let parentId = parseInt(parent.querySelector(".blockid").value);
        return getChildBlocks(parentId, flowy.output()).length == 0;
    }
    function rearrange(block, parent) {
        return true;
    }
    function drag(block) {
        block.classList.add("blockdisabled");
        tempblock2 = block;
    }
    function release() {
        if (tempblock2) {
            tempblock2.classList.remove("blockdisabled");
        }
    }
    function addEventListenerMulti(type, listener, capture, selector) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].addEventListener(type, listener, capture);
        }
    }
    //Block Nav
    var blockNavClick = function () {
        document.querySelector(".navactive").classList.add("navdisabled");
        document.querySelector(".navactive").classList.remove("navactive");
        this.classList.add("navactive");
        this.classList.remove("navdisabled");

        switchActiveBlockList(this.getAttribute("id"));
    };
    addEventListenerMulti("click", blockNavClick, false, ".side");
    //Right menu
    document.getElementById("close").addEventListener("click", function () {
        if (rightcard) {
            rightcard = false;
            document.getElementById("properties").classList.remove("expanded");
            setTimeout(function () {
                document.getElementById("propwrap").classList.remove("itson");
            }, 300);
            tempblock.classList.remove("selectedblock");
        }
    });
    //Delete buttons
    document.getElementById("removeblock").addEventListener("click", function () {
        flowy.deleteBranch(flowy.getActiveBlockId());
    });

    //Block click events
    var aclick = false;
    var noinfo = false;
    var beginTouch = function (event) {
        aclick = true;
        noinfo = false;
        if (event.target.closest(".create-flowy")) {
            noinfo = true;
        }
    };
    var checkTouch = function (event) {
        aclick = false;
    }

    var doneTouch = function (event) {
        if (event.type === "mouseup" && aclick && !noinfo) {
            document.querySelectorAll(".selectedblock").forEach((el) => el.classList.remove("selectedblock"));
            let blockEl = event.target.closest(".block");
            let blockId = flowy.getActiveBlockId();
            if (blockEl && !blockEl.classList.contains("dragging")) {
                if (chartProperties[blockId] == null) {
                    flowyBlock = getBlock(blockId);
                    let method = getDataProperty(flowyBlock["data"], "method");
                    let path = getDataProperty(flowyBlock["data"], "path");
                    let logic = getDataProperty(flowyBlock["data"], "logic");

                    //Properties for Swagger methods
                    if (method) {
                        //Set chartProperties to match block
                        Object.keys(swaggerJson.paths).forEach((swaggerPath) => {
                            if (swaggerPath == path) {
                                pathMethods = Object.keys(swaggerJson.paths[swaggerPath]);
                                pathMethods.forEach((pathMethod) => {
                                    if (pathMethod == method) {
                                        chartProperties[blockId] = {
                                            path: method + " " + path,
                                            properties: swaggerJson.paths[swaggerPath][pathMethod].parameters
                                        };
                                    }
                                });
                            }
                        });
                    } else if(logic) { //Properties for if, for, etc
                        chartProperties[blockId] = {
                            logic: logic,
                            properties: [
                                {
                                    name: "expression",
                                    description: "what to evaluate",
                                    required: "true",
                                    type: "string"
                                }
                            ]
                        };
                    } else {
                        chartProperties[blockId] = {
                            properties: []
                        };
                    }
                }

                document.getElementById("parameterinputs").innerHTML = "";
                //Add properties to the right card
                chartProperties[blockId].properties.forEach((property) => {
                    // render the name first and with unique formatting from the rest of the data
                    document
                        .getElementById("parameterinputs")
                        .insertAdjacentHTML("beforeend", `<h3 class="propheader">Name: ${property.name}</h3>`);
                    Object.keys(property).forEach((propertyKey) => {
                        if (propertyKey != "name") {
                            if (propertyKey == "schema") {
                                document
                                    .getElementById("parameterinputs")
                                    .insertAdjacentHTML(
                                        "beforeend",
                                        `<p class="propdata">${propertyKey.toUpperCase()}: ${JSON.stringify(
                                            property[propertyKey]
                                        )}</p>`
                                    );
                            } else {
                                document
                                    .getElementById("parameterinputs")
                                    .insertAdjacentHTML(
                                        "beforeend",
                                        `<p class="propdata">${propertyKey.toUpperCase()}: ${property[propertyKey]}</p>`
                                    );
                            }
                        }
                    });

                    if(property.type != null) {
                        let htmlToAdd
                        if(property.enum) {
                            let options = property.enum.map(val => `<option value="${val}">${val}</option>`);
                            htmlToAdd = `<select class="dropme" data-id="${blockId} ${property.name}">${options.join("\n")}</select>`
                        } else if(property.type == "string" || property.type == "integer") {
                            htmlToAdd = `<input class="propinput" type="text" data-id="${blockId} ${property.name}">`
                        } else if (property.type == "boolean") {
                            htmlToAdd = `<input type="checkbox" data-id="${blockId} ${property.name}">`
                        }
                        document.getElementById("parameterinputs").insertAdjacentHTML("beforeend", htmlToAdd)
                        document.querySelector(`[data-id='${blockId} ${property.name}']`).addEventListener("change", event => propertyChanged(event, blockId, property.name))
                    } else if (property.schema != null) {
                    }
                });

                //Pop the right card and highlight the block
                tempblock = event.target.closest(".block");
                rightcard = true;
                document.getElementById("properties").classList.add("expanded");
                document.getElementById("propwrap").classList.add("itson");
                tempblock.classList.add("selectedblock");
            }
        }
    };

    function propertyChanged(event, blockId, propertyName) {
        let value
        if(event.target.type == "checkbox") {
            value = event.currentTarget.checked
        } else {
            value = event.target.value
        }

        let properties = chartProperties[blockId].properties
        for(let i = 0; i < properties.length; i++) {
            if(properties[i].name == propertyName) {
                properties[i].value = value
                break;
            }
        }
    }

    let importSwagger = function (event) {
        var reader = new FileReader();

        reader.onload = function (event) {
            try {
                let fileJson = JSON.parse(event.target.result);
                //TODO do better input validation
                if (fileJson.info) {
                    swaggerJson = fileJson;
                    populateBlocks();
                } else {
                    throw new Error("Not a real swagger json file?");
                }
            } catch (e) {
                //TODO
                console.log("Error reading swagger json");
                console.error(e);
            }
        };
        reader.readAsText(event.target.files[0]);
    };
    let populateBlocks = function () {
        apiPaths = Object.keys(swaggerJson.paths);
        for (let i = 0; i < apiPaths.length; i++) {
            let path = apiPaths[i];

            //Build a block for each path
            pathMethods = Object.keys(swaggerJson.paths[path]);
            //TODO null check as appropriate
            for (let j = 0; j < pathMethods.length; j++) {
                let pathMethod = pathMethods[j];
                if(pathMethod=="servers") {
                    continue;
                }
                let blockHtml = generateBlock(
                    pathMethod + " " + path,
                    swaggerJson.paths[path][pathMethod]["summary"],
                    "assets/arrow.svg",
                    [
                        { name: "method", value: pathMethod },
                        { name: "path", value: path }
                    ]
                );
                addBlockToBlockList("api", blockHtml);
            }

            //Models
            let models;
            //If swagger v2
            if (swaggerJson["swagger"]) {
                models = swaggerJson.definitions;
            } else if (swaggerJson["openapi"]) {
                //If swagger v3
                models = swaggerJson.components.schemas;
            }
        }
    };
    addEventListener("mousedown", beginTouch, false);
    addEventListener("mousemove", checkTouch, false);
    addEventListener("mouseup", doneTouch, false);
    addEventListenerMulti("touchstart", beginTouch, false, ".block");

    // Utility functions
    function switchActiveBlockList(id) {
        blockLists.active = id;
        document.getElementById("blocklist").innerHTML = blockLists[id].join("\n");
    }

    //id = which blocklist to add block to. api, logic, loggers
    function addBlockToBlockList(id, htmlToAdd) {
        blockLists[id].push(htmlToAdd);
        if (blockLists.active == id) {
            document.getElementById("blocklist").innerHTML = blockLists[id].join("\n");
        }
    }

    function generateBlock(title, description="-", iconPath = "assets/action.svg", data = []) {
        let dataFields = data.map(
            (d) => `<input type="hidden" name="${d.name}" class="${d.name}" value="${d.value}"></input>`
        );
        return `<div class="blockelem create-flowy noselect blockroot">${dataFields.join(
            "\n"
        )}<div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="${iconPath}"></div><div class="blocktext">                        <p class="blocktitle ${title.split(" ")[0]}">${title}</p><p class="blockdesc">${description}</p>        </div></div></div>`;
    }

    function filterBlocks(event) {
        let filter = event.target.value;
        let activeBl = blockLists[blockLists.active];
        document.getElementById("blocklist").innerHTML = activeBl.filter((b) => {
            let parser = new DOMParser();
            let title = parser.parseFromString(b, "text/html").querySelector(".blocktitle");
            return title.innerHTML.toLowerCase().indexOf(filter.toLowerCase()) != -1;
        });
    }
    const searchInput = document.querySelector("#search input");
    searchInput.addEventListener("input", filterBlocks, false);

    const importBtn = document.querySelector("#importinput");
    importBtn.addEventListener("change", importSwagger, false);

    let runScript = function () {
        executeScript(chartProperties);
    };
    const runBtn = document.querySelector("#runscript");
    runBtn.addEventListener("click", runScript, false);
});
