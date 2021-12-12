/**
 * Copyright 2021 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
 module.exports = function(RED) {
    var settings = RED.settings;
    const inspector = require('inspector');

    function NodeInspectorNode(config) {
        RED.nodes.createNode(this,config);
        this.inputField      = config.inputField;
        this.host            = config.host;
        this.portNumber      = parseInt(config.portNumber);

        var node = this;
        
        function openInspector() {
            try {
                inspector.open(node.portNumber, node.host);
                var statusText = node.host + ":" + node.portNumber;
                node.status({fill:"blue", shape:"dot", text:statusText});
            }
            catch(err) {
                node.error("Cannot open inspector: " + err);
            }
        }
        
        function closeInspector() {
            try {
                inspector.close();
                node.status({});
            }
            catch(err) {
                node.error("Cannot close inspector: " + err);
            }
        }
        
        function isInspectorOpen() {
            return inspector.url() != undefined;
        }
        
        // The inspector can already be open:
        // - When NodeJs was started with --inspector startup arguments
        // - After a redeploy in Node-RED, because in the "close" event the inspector isn't stopped
        if(isInspectorOpen()) {
            var statusText = node.host + ":" + node.portNumber;
            node.status({fill:"blue", shape:"dot", text:statusText});
        }            
        else {
            // Only autostart the inspector, when it is not started already.
            if(config.autoStart) {
                openInspector();
            }
            else {
                node.status({});
            }
        }

        node.on("input", function(msg) {
            var command;
            
            try {
                // Get the command from the specified input location.
                command = RED.util.evaluateNodeProperty(node.inputField, "msg", this, msg);
            } 
            catch(err) {
                node.error("Error getting command from msg." + node.inputField + " : " + err.message);
                return;
            }
 
            switch(command) {
                case "open_inspector":
                    if(isInspectorOpen()) {
                        node.warn("The inspector is already open");
                    }
                    else {
                        openInspector();
                    }
                    break;
                case "close_inspector":
                    if(!isInspectorOpen()) {
                        node.warn("The inspector was not opened yet");
                    }
                    else {
                        closeInspector();
                        console.log("INSPECTOR URL = "+ inspector.url());
                    }
                    break;
                default:
                    node.error("Unsupported command '"+ command + "'");
            }
        });
        
        node.on("close", function() {
            // Don't close the debugger, otherwise you need to reconnect again after every deploy in Node-RED
            /*if (isInspectorOpen()) {
                closeInspector();
            }*/
        });
    }

    RED.nodes.registerType("node-inspector", NodeInspectorNode);
}
