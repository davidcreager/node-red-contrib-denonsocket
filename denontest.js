	const net = require("net");
	const inspect = require("util").inspect;
    class denonsockNode {
		constructor(host, port = 23) {
			this.host = host;
			this.port = port;
		    this.socket = new net.Socket();
			this.socket.setEncoding('ascii');
			this.socket.on('data', (data) => {
			  console.log("Data  received " + inspect(data));
			});
			this.socket.on('close', () => {
			  console.log("Close received");
			});
			this.socket.on('error', (error) => {
			  console.log("error received " + error);
			});
			this.socket.on('connect', () => {
				console.log("connect received");
			});
		}
		write(command) {
			return new Promise((resolve) => {
							this.socket.write(`${command}\r`, 'ascii', resolve);
						});
		}
		connect() {
			return new Promise((resolve, reject) => {
				this.socket.once('connect', () => {
					console.log("ONCE: connect received - will resolve");
					resolve();
					this.socket.removeListener('error', reject);
				});
				this.socket.once('error', (error) => {
					console.log("ONCE: error received - will reject");
					reject(error);
					this.socket.removeListener('connect', resolve);
				});
				console.log("Connect - about to issue " + this.host + ":" + this.port);
				this.socket.connect(this.port, this.host);
			});
		}
		disconnect() {
			console.log("Disconnect - about to issue " + this.host + ":" + this.port);
			this.socket.end();
		}
    }
	module.exports = denonsockNode;
