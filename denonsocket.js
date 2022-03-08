module.exports = function(RED) {
	const ws = require("ws");
	const inspect = require("util").inspect;
    function denonsockNode(config) {
		RED.nodes.createNode(this,config);
		this.wssServer = null;
        var node = this;
		node.on('close', ()=> {
			if (node.wssServer) node.wssServer.close();
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
					if (node.wssServer) {
						node.wssServer.close();
						node.status({fill: "blue", shape: "ring", text: "disconnecting "});
					} else {
						node.status({fill: "yellow", shape: "ring", text: "Disconnected "});
					}
					return null;
				}
				if ( (node.sURL) && (node.sURL != msg.url) ) {
					node.wssServer.close();
				}
				node.sURL = msg.url;
				node.wssServer = new ws.WebSocket(msg.url);
				node.status({fill: "blue", shape: "ring", text: "connecting to " + msg.url})
				node.wssServer.on("open", () => {
					node.status({fill: "green", shape: "dot", text: "connected:" + node.sURL});
				});
				node.wssServer.on("message", data => {
					let tdata = null;
					try {
						tdata = JSON.parse(data);
					} catch (err) {
						tdata = data + "";
						node.warn(["mesg NOT parsed " + err,err, tdata,data,msg]);
					}
					node.send({topic: node.sTopic, url: node.sURL, payload: tdata});
				});
				node.wssServer.on("error", data => {
					node.status({fill: "red", shape: "ring", text: "Error " + data});
					
				});
				node.wssServer.on("close", () => {
					node.status({fill: "yellow", shape: "ring", text: "closed"});
				});
			} else {
				node.error("[denonsock] Payload must be connect|disconnect it is " + msg.payload);
				node.status({fill: "red", shape: "ring", text: "Unknown payload " + msg.payload});
				return null;
			}
        });
    }
    RED.nodes.registerType("denonsock",denonsockNode);
}