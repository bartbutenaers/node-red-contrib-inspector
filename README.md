# node-red-contrib-inspector
A Node-RED node to (de)activate a NodeJs code inspector session

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-inspector
```

## Support my Node-RED developments

Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Introduction to introspection

### Inspector basics
Node-RED runs on top of [NodeJs](https://nodejs.org/en/), which is a Javascript runtime that in turn runs on top of the Google Chrome [V8](https://v8.dev/) Javascript engine. The V8 engine contains a.o. an inspector which offers lots of technical features (code debugger, cpu profiler, memory profiler...).  By starting NodeJs in ***debug mode***, the V8 inspector can be accessed (by default on port 9229) from the outside via the Chrome Devtools [protocol](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/).  This way third party tools (e.g. Google Chrome dev tools, Microsoft Visual Studio Code, ...) can debug and profile NodeJs applications.  The V8 engine is written in C++, but fortunately NodeJs contains an [Inspector](https://nodejs.org/api/inspector.html) module which is a Javascript wrapper around the V8 inspector.

![architecture](https://user-images.githubusercontent.com/14224149/145110993-8557badb-5cae-45de-98be-436740a3fa2a.png)

### Debug mode
To activate the inspector (and make it public accessible via the port), some ***extra startup parameters*** need to be passed to start in debug mode:

```
node  --inspect=127.0.0.1 --inspect-brk  /usr/bin/node-red
```
Note that the --inspect-brk is optional, to pauze the debugger automatically at the first statement of Node-RED.  Which is only required when you want to debug the Node-RED startup code.

### Disadvantages
Having to add startup command line parameters has some disadvantages.  Indeed it is not always easy to change the Node-RED startup command:
+ When running Node-RED on Raspberry, the installation [script](https://nodered.org/docs/getting-started/raspberrypi) prepares everything to run Node-RED as a Systemd background service.  Works very well out of the box, so you don't want to start messing with that...

+ When you need to troubleshoot a Node-RED system that is live and not started previously in debug mode.  And perhaps you don't want to restart it for some reason (e.g. high available, ...).  

+ When running Node-RED inside a [Docker](https://nodered.org/docs/getting-started/docker) container.  The Node-RED Docker image starts Node-RED with a fixed startup command. Some time ago I have been [investigating](https://discourse.nodered.org/t/debugging-nodejs-in-node-red-docker-container/21370) to fix that, but it was quite complex to get it done.

### The solution
This node allows to activate the NodeJs inspector from within a Node-RED flow, without having to alter the Node-RED startup command.  Which solves all the disadvantages that have been listed above:

![new architecture](https://user-images.githubusercontent.com/14224149/145113656-edc68172-d0f7-4745-a2a0-108adead9631.png)

## Node usage

The following example flow shows how to open and close the inspector:

![flow](https://user-images.githubusercontent.com/14224149/145113879-90a11bab-d003-4383-b993-826aab5d0fd8.png)
```
[{"id":"3add02d7.7df60e","type":"node-inspector","z":"f6f2187d.f17ca8","inputField":"payload","host":"0.0.0.0","portNumber":9229,"autoStart":false,"name":"","x":580,"y":380,"wires":[[]]},{"id":"8cf9f9cd.1a6a88","type":"inject","z":"f6f2187d.f17ca8","name":"","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"open_inspector","payloadType":"str","x":340,"y":380,"wires":[["3add02d7.7df60e"]]},{"id":"4b2a8ca1.de70e4","type":"inject","z":"f6f2187d.f17ca8","name":"","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"close_inspector","payloadType":"str","x":340,"y":440,"wires":[["3add02d7.7df60e"]]}]
```
Once the inspector is open, the host and port number will be displayed in the node status.

Now you can start debugging your Node-RED server flow.  See this [wiki](https://github.com/bartbutenaers/node-red-contrib-inspector/wiki) for a tutorial, containing all the steps to start using the Chrome debugger.

### Usage in a Docker container
When Node-RED is running in a Docker container, you will need to do only a few extra steps:

1. An extra port mapping `-p 9229:9229` need to be added to the [standard](https://nodered.org/docs/getting-started/docker) Node-RED Docker command:
   ```
   docker run -it -p 1880:1880 -p 9229:9229 -v node_red_data:/data --name mynodered nodered/node-red
   ```
2. Enter `0.0.0.0` in the *"host"* settings on this node's config screen.  Indeed because the NodeJs inspector listens on the loopback interface, host `localhost` or `127.0.0.1` will not work (see [here](https://www.howtogeek.com/225487/what-is-the-difference-between-127.0.0.1-and-0.0.0.0/) for more information).

### Limitations
+ The code inspector can only be started this way, as soon as this node has been started by Node-RED.  Which means it is not possible to debug the Node-RED ***startup code*** this way, which you need to achieve via the optional `--inspect-brk` startup command parameter flag.
+ I have only tested a ***single instance*** of this node in a flow.  So not sure how it will behave if multiple nodes are added to a flow, and used simultaneously...

## Node properties

### Cmd field
Specify in which input message field the commands will be injected. The available commands are:
+ `open_inspector`: to open the inspector, and make it accessible via the specified port.
+ `close_inspector`: to close the inspector, and stop listening to the port.

### Host
Specify on which host the NodeJs inspector has to listen for connections. The default port is `localhost`.  But for example for a Docker container, the host needs to be `0.0.0.0`.

### Port
Specify on which port the NodeJs inspector has to listen for connections. The default port is `9229`.

### Autostart
When activated, the inspector will be activated automatically at flow startup.  This can be useful e.g. for a development Node-RED system, which needs to be accessible for inspection all the time.

Of course the same effect can be achieved by a Trigger node, which injects automatically at startup an "open_inspector" message.

## Troubleshooting

Via `http://localhost:9229/json` you can test whether the inspector is available on port 9229, because you should get a json result like this:
```
[ {
  "description": "node.js instance",
  "devtoolsFrontendUrl": "chrome-devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=localhost:9229/0c766b46-ad58-4f05-97f9-54d84cdcc9cb",
  "devtoolsFrontendUrlCompat": "chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=localhost:9229/0c766b46-ad58-4f05-97f9-54d84cdcc9cb",
  "faviconUrl": "https://nodejs.org/static/favicon.ico",
  "id": "0c766b46-ad58-4f05-97f9-54d84cdcc9cb",
  "title": "node_modules/node-red/red.js",
  "type": "node",
  "url": "file:///usr/src/node-red/node_modules/node-red/red.js",
  "webSocketDebuggerUrl": "ws://localhost:9229/0c766b46-ad58-4f05-97f9-54d84cdcc9cb"
} ]
```
