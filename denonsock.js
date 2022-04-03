module.exports = function(RED) {
	const Denon = require('denon-client');
	const inspect = require("util").inspect;
    function denonsockNode(config) {
		RED.nodes.createNode(this,config);
		this.denonClient = null;
        var node = this;
		this.sTopic = "Unset";
		node.status({fill: "yellow", shape: "ring", text: "Initialised "});
		node.connected = false;
		this.sendMsg = function(ev, data) {
			node.send( {topic:node.sTopic, payload: {"event": ev, "data": data} });
		}
		node.on('close', ()=> {
			if (node.denonClient?.disconnect) node.denonClient.disconnect();
			node.denonClient = null;
			node.connected = false;
			node.warn("Closing server ");
		});
        node.on('input', (msg) => {
			if (msg.payload == "connect" || msg.payload == "disconnect") {
				node.sTopic = msg.topic;
				if ( msg.payload == "connect" && (!msg.url) ) {
					node.error("[denonsock] connect must supply msg.url ");
					node.status({fill: "red", shape: "ring", text: "Msg.url not valid"});
					return null;
				} else if (msg.payload == "disconnect") {
					if (node.denonClient && (node.connected)) {
						node.denonClient.disconnect();
						node.status({fill: "blue", shape: "ring", text: "Disconnected "});
						node.connected = false;
					} else {
						node.status({fill: "yellow", shape: "ring", text: "Disconnected "});
						node.connected = false;
					}
					return null;
				}
				if ( (node.sURL) && (node.sURL != msg.url) ) {
					//node.wssServer.close();
				}
				if (node.denonClient?.disconnect) node.denonClient.disconnect();
				node.sURL = msg.url;
				node.denonClient = new Denon.DenonClient(msg.url);
				node.status({fill: "blue", shape: "ring", text: "connecting to " + node.sURL})
				node.denonClient.on("masterVolumeChanged", data => node.sendMsg("masterVolumeChanged", data));
				node.denonClient.on("inputChanged", data => node.sendMsg("inputChanged", data));
				node.denonClient.on("powerChanged", data => node.sendMsg("powerChanged", data));
				node.denonClient.on("muteChanged", data => node.sendMsg("muteChanged", data));
				node.denonClient.connect()
					.then( () => {
						node.warn("[denonsock] Connected to " + node.sURL);
						node.status({fill: "green", shape: "dot", text: "Connected to " + node.sURL});
						node.connected = true;
					})
					.then( () => {
						node.denonClient.getPower();
					})
					.catch( (err) => {
						node.error("[denonsock] Connection failed with " + err);
						node.status({fill: "red", shape: "ring", text: "Failed " + err})
						node.connected = false
					});
			} else if ( typeof(msg.payload) == "object" &&
							msg.payload.hasOwnProperty("command") ) {
					if (!node.connected) {
						node.error("[denonsock][Error] Command received and socket not connected");
						node.status({fill: "yellow", shape: "ring", text: "Disconnected "});
						return null;
					}
					const cmds = {setInput: true, setMute: true, setPower: true, setVolume:true, getPower: true, getVolume: true}
					if (cmds[msg.payload.command]) {
						node.denonClient[msg.payload.command](msg.payload.value)
						.then( (ret) => {
							//node.status({fill: "green", shape: "dot", text: msg.payload.command + " sent to " + node.sURL});
							node.status({fill: "red", shape: "dot", text: msg.payload.command + " ret= " + ret});
						})
						.catch( (err) => {
							node.status({fill: "red", shape: "ring", text: msg.payload.command + "Failed " + err})
						});
					} else {
						node.error("[denonsock] Payload command must be " + Object.keys(cmds).join("|") + " it is " + msg.payload);
						node.status({fill: "red", shape: "ring", text: "Unknown Command " + msg.payload.command});
					}
			} else {
				node.error("[denonsock] Payload must be connect|disconnect it is " + msg.payload);
				node.status({fill: "red", shape: "ring", text: "Unknown payload " + msg.payload});
				return null;
			}
        });
    }
    RED.nodes.registerType("denonsock",denonsockNode);
}