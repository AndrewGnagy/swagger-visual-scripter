document.addEventListener("DOMContentLoaded", function(){
    let swaggerJson;
    var rightcard = false;
    var tempblock;
    var tempblock2;
    var blockLists = {
        active: 'api',
        api: [],
        logic: ['<div class="blockelem create-flowy noselect"><input type="hidden" name="logic" class="logic" value="if"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/database.svg"></div><div class="blocktext">                        <p class="blocktitle">IF</p><p class="blockdesc">If block</p>        </div></div></div>', '<div class="blockelem create-flowy noselect"><input type="hidden" name="logic" class="logic" value="for"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/database.svg"></div><div class="blocktext">                        <p class="blocktitle">FOR</p><p class="blockdesc">For loop</p>        </div></div></div>'],
        loggers: ['<div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="9"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/log.svg"></div><div class="blocktext">                        <p class="blocktitle">Add new log entry</p><p class="blockdesc">Adds a new log entry to this project</p>        </div></div></div>']
    }

    /**
     * THE ASSIGNMENT:
     * When you add a new block from the toolbox to the chart, pull the properties from the swaggerJson.  chartProperties will just store these properties for existing entries on the flow chart
     */

    /**
     * {
     *  flowyId: {
     *      path: "",
     *      properties: []
     *  }
     * }
     */
    var chartProperties = {}

    flowy(document.getElementById("canvas"), drag, release, snapping, rearrange);
    function snapping(block, first, parent) {
        //Element can be modified here
        let specialBlockCheck = block.querySelector("[name=\"logic\"]");
        if (specialBlockCheck && specialBlockCheck.value == "if") {
            let blockId = parseInt(block.querySelector(".blockid").value);
            //This seems hacky???
            setTimeout(function() {
                flowy.addBlock(new DOMParser().parseFromString(generateBlock("True", "executes if true"), "text/html").body.childNodes[0], blockId);
                flowy.addBlock(new DOMParser().parseFromString(generateBlock("False", "executes if false"), "text/html").body.childNodes[0], blockId);
            }, 250);
        }

        //Don't allow multiple children to be attached to the same block
        if(first) {
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
    var blockNavClick = function(){
        document.querySelector(".navactive").classList.add("navdisabled");
        document.querySelector(".navactive").classList.remove("navactive");
        this.classList.add("navactive");
        this.classList.remove("navdisabled");

        switchActiveBlockList(this.getAttribute("id"))
    }
    addEventListenerMulti("click", blockNavClick, false, ".side");
    //Right menu
    document.getElementById("close").addEventListener("click", function(){
        if (rightcard) {
            rightcard = false;
            document.getElementById("properties").classList.remove("expanded");
            setTimeout(function(){
                document.getElementById("propwrap").classList.remove("itson"); 
            }, 300);
            tempblock.classList.remove("selectedblock");
        }
    });
    //Delete buttons
    document.getElementById("removeblock").addEventListener("click", function(){
        flowy.deleteBranch(flowy.getActiveBlockId());
    });
    // document.getElementById("addblock").addEventListener("click", function(){
        //generateBlock("api", "blah", "a very good block", "assets/arrow.svg", "")
        // let newBlock = document.createElement("div");
        // newBlock.classList = "blockelem noselect block";
        // newBlock.innerHTML = '<input type="hidden" name="blockelemtype" class="blockelemtype" value="9"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/log.svg"></div><div class="blocktext">                        <p class="blocktitle">Add new log entry</p><p class="blockdesc">Adds a new log entry to this project</p>        </div></div>';
        // flowy.addBlock(newBlock, 1);
    // });
    // document.getElementById("removeblocks").addEventListener("click", function(){
    //     flowy.deleteBlocks();
    // });
    //Block click events
    var aclick = false;
    var noinfo = false;
    var beginTouch = function (event) {
        aclick = true;
        noinfo = false;
        if (event.target.closest(".create-flowy")) {
            noinfo = true;
        }
    }
    var checkTouch = function (event) {
        aclick = false;
    }
    var doneTouch = function (event) {
        if (event.type === "mouseup" && aclick && !noinfo) {
            document.querySelectorAll(".selectedblock").forEach((el) => el.classList.remove("selectedblock"));
            if (event.target.closest(".block") && !event.target.closest(".block").classList.contains("dragging")) {
                console.log("AHHHHHH")
                if(chartProperties[flowy.getActiveBlockId()] == null) {
                    let blockPath = event.target.closest(".blockroot").getAttribute("id")
                    let method = blockPath.split(' ')[0]
                    let path = blockPath.split(' ')[1]

                    Object.keys(swaggerJson.paths).forEach(swaggerPath => {
                        if(swaggerPath == path) {
                            pathMethods = Object.keys(swaggerJson.paths[swaggerPath])
                            pathMethods.forEach(pathMethod => {
                                if(pathMethod == method) {
                                    chartProperties[flowy.getActiveBlockId()].path = blockPath
                                    chartProperties[flowy.getActiveBlockId()].properties = swaggerJson.paths[swaggerPath][pathMethod].parameters
                                }
                            })
                        }
                    })

                    // chartProperties[flowy.getActiveBlockId()] = {
                    //     'Name': properties[i].name,
                    //     'Description': properties[i].description,
                    //     'Required': properties[i].required,
                    //     'Format': properties[i].in,
                    //     'Type': properties[i].type
                    // }
                }
                
                document.getElementById("proplist").innerHTML = chartProperties[flowy.getActiveBlockId()]

                tempblock = event.target.closest(".block");
                rightcard = true;
                document.getElementById("properties").classList.add("expanded");
                document.getElementById("propwrap").classList.add("itson");
                tempblock.classList.add("selectedblock");
            }
        }
    }

    let importSwagger = function (event) {
        var reader = new FileReader();

        reader.onload = function(event) {
            try {
                let fileJson = JSON.parse(event.target.result);
                //TODO do better input validation
                if (fileJson.info) {
                    swaggerJson = fileJson;
                    populateBlocks();
                } else {
                    throw new Error("Not a real swagger json file?");
                }
            } catch(e) {
                //TODO
                console.log("Error reading swagger json");
                console.error(e);
            }
        }
        reader.readAsText(event.target.files[0]);
    }
    let populateBlocks = function () {
        console.log(swaggerJson)
        apiPaths = Object.keys(swaggerJson.paths);
        for(let i = 0; i < apiPaths.length; i++) {
            let path = apiPaths[i];
            console.log(swaggerJson.paths[path])

            //Build a block for each path
            pathMethods = Object.keys(swaggerJson.paths[path]);
            //TODO null check as appropriate
            for(let j=0; j < pathMethods.length; j++) {
                let pathMethod = pathMethods[j];
                let blockHtml = generateBlock(pathMethod + " " + path, swaggerJson.paths[path][pathMethod]["summary"], "assets/arrow.svg", [{name: "method", value: pathMethod}, {name: "path", value: path}]);
                addBlockToBlockList("api", blockHtml);
            }

            //Models
            let models;
            //If swagger v2
            if(swaggerJson["swagger"]) {
                models = swaggerJson.definitions;
            } else if (swaggerJson["openapi"]) { //If swagger v3
                models = swaggerJson.components.schemas;
            }

            // console.log(swaggerJson.definitions)
            // setProperties("api", models.Request)
        }
    }
    addEventListener("mousedown", beginTouch, false);
    addEventListener("mousemove", checkTouch, false);
    addEventListener("mouseup", doneTouch, false);
    addEventListenerMulti("touchstart", beginTouch, false, ".block");

    // Utility functions
    function switchActiveBlockList(id) {
        blockLists.active = id
        document.getElementById("blocklist").innerHTML = blockLists[id].join("\n");
    }

    //id = which blocklist to add block to. api, logic, loggers
    function addBlockToBlockList(id, htmlToAdd) {
        blockLists[id].push(htmlToAdd)
        if(blockLists.active == id) {
            document.getElementById("blocklist").innerHTML = blockLists[id].join("\n");
        }
    }

    // // "properties" is actually "parameters" in the Swagger JSON
    // function setProperties(path, properties) {
    //     let propList
    //     for (let i = 0; i < properties.length; i++) {
    //         propList[i] = {
    //             'Name': properties[i].name,
    //             'Description': properties[i].description,
    //             'Required': properties[i].required,
    //             'Format': properties[i].in,
    //             'Type': properties[i].type
    //         }
    //     }
    // }

    function generateBlock(title, description, iconPath="assets/action.svg", data=[]) {
        console.log("AHHHHHHH")
        let dataFields = data.map(d => `<input type="hidden" name="${d.name}" class="${d.name}" value="${d.value}"></input>`);
        return `<div id=${title} class="blockelem create-flowy noselect blockroot">${dataFields.join("\n")}<div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="${iconPath}"></div><div class="blocktext">                        <p class="blocktitle">${title}</p><p class="blockdesc">${description}</p>        </div></div></div>`
    }

    function filterBlocks(event) {
        let filter = event.target.value;
        let activeBl = blockLists[blockLists.active];
        document.getElementById("blocklist").innerHTML = activeBl.filter(b => {
            let parser = new DOMParser();
            let title = parser.parseFromString(b, "text/html").querySelector('.blocktitle');
            return title.innerHTML.toLowerCase().indexOf(filter.toLowerCase()) != -1;
        });
    }
    const searchInput = document.querySelector("#search input");
    searchInput.addEventListener("input", filterBlocks, false);
    
    const importBtn = document.querySelector("#importinput");
    importBtn.addEventListener("change", importSwagger, false);

    let runScript = function() {
        executeScript(flowy.output());
    }
    const runBtn = document.querySelector("#publish");
    runBtn.addEventListener("click", runScript, false);
});