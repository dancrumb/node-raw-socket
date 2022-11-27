
// @ts-expect-error TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
var events = require ("events");
// @ts-expect-error TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
var net = require ("net");
// @ts-expect-error TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
var raw = require ("./build/Release/raw.node");
// @ts-expect-error TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
var util = require ("util");

function _expandConstantObject (object: any) {
	var keys = [];
	for (key in object)
		keys.push (key);
	for (var i = 0; i < keys.length; i++)
		object[object[keys[i]]] = parseInt (keys[i]);
}

var AddressFamily = {
	1: "IPv4",
	2: "IPv6"
};

_expandConstantObject (AddressFamily);

var Protocol = {
	0: "None",
	1: "ICMP",
	6: "TCP",
	17: "UDP",
	58: "ICMPv6"
};

_expandConstantObject (Protocol);

for (var key in events.EventEmitter.prototype) {
  raw.SocketWrap.prototype[key] = events.EventEmitter.prototype[key];
}

// @ts-expect-error TS(7006): Parameter 'options' implicitly has an 'any' type.
function Socket (options) {
// @ts-expect-error TS(2339): Property 'super_' does not exist on type '(options... Remove this comment to see the full error message
	Socket.super_.call (this);

// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.requests = [];
// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.buffer = Buffer.alloc((options && options.bufferSize)
			? options.bufferSize
			: 4096);

// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.recvPaused = false;
// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.sendPaused = true;

// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.wrap = new raw.SocketWrap (
			((options && options.protocol)
					? options.protocol
					: 0),
			((options && options.addressFamily)
					? options.addressFamily
// @ts-expect-error TS(2339): Property 'IPv4' does not exist on type '{ 1: strin... Remove this comment to see the full error message
					: AddressFamily.IPv4)
		);

// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	var me = this;
// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.wrap.on ("sendReady", this.onSendReady.bind (me));
// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.wrap.on ("recvReady", this.onRecvReady.bind (me));
// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.wrap.on ("error", this.onError.bind (me));
// @ts-expect-error TS(2683): 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
	this.wrap.on ("close", this.onClose.bind (me));
};

util.inherits (Socket, events.EventEmitter);

Socket.prototype.close = function () {
	this.wrap.close ();
	return this;
}

// @ts-expect-error TS(7006): Parameter 'level' implicitly has an 'any' type.
Socket.prototype.getOption = function (level, option, value: any, length) {
	return this.wrap.getOption (level, option, value, length);
}

Socket.prototype.onClose = function () {
	this.emit ("close");
}

// @ts-expect-error TS(7006): Parameter 'error' implicitly has an 'any' type.
Socket.prototype.onError = function (error) {
	this.emit ("error", error);
	this.close ();
}

Socket.prototype.onRecvReady = function () {
	var me = this;
	try {
// @ts-expect-error TS(7006): Parameter 'buffer' implicitly has an 'any' type.
		this.wrap.recv (this.buffer, function (buffer, bytes, source) {
			var newBuffer = buffer.slice (0, bytes);
			me.emit ("message", newBuffer, source);
		});
	} catch (error) {
		me.emit ("error", error);
	}
}

Socket.prototype.onSendReady = function () {
	if (this.requests.length > 0) {
		var me = this;
		var req = this.requests.shift ();
		try {
			if (req.beforeCallback)
				req.beforeCallback ();
			this.wrap.send (req.buffer, req.offset, req.length,
// @ts-expect-error TS(7006): Parameter 'bytes' implicitly has an 'any' type.
					req.address, function (bytes) {
				req.afterCallback.call (me, null, bytes);
			});
		} catch (error) {
			req.afterCallback.call (me, error, 0);
		}
	} else {
		if (! this.sendPaused)
			this.pauseSend ();
	}
}

Socket.prototype.pauseRecv = function () {
	this.recvPaused = true;
	this.wrap.pause (this.recvPaused, this.sendPaused);
	return this;
}

Socket.prototype.pauseSend = function () {
	this.sendPaused = true;
	this.wrap.pause (this.recvPaused, this.sendPaused);
	return this;
}

Socket.prototype.resumeRecv = function () {
	this.recvPaused = false;
	this.wrap.pause (this.recvPaused, this.sendPaused);
	return this;
}

Socket.prototype.resumeSend = function () {
	this.sendPaused = false;
	this.wrap.pause (this.recvPaused, this.sendPaused);
	return this;
}

// @ts-expect-error TS(7006): Parameter 'buffer' implicitly has an 'any' type.
Socket.prototype.send = function (buffer, offset, length, address,
// @ts-expect-error TS(7006): Parameter 'beforeCallback' implicitly has an 'any'... Remove this comment to see the full error message
		beforeCallback, afterCallback) {
	if (! afterCallback) {
		afterCallback = beforeCallback;
		beforeCallback = null;
	}

	if (length + offset > buffer.length)  {
		afterCallback.call (this, new Error ("Buffer length '" + buffer.length
				+ "' is not large enough for the specified offset '" + offset
				+ "' plus length '" + length + "'"));
		return this;
	}

	if (! net.isIP (address)) {
		afterCallback.call (this, new Error ("Invalid IP address '" + address + "'"));
		return this;
	}

	var req = {
		buffer: buffer,
		offset: offset,
		length: length,
		address: address,
		afterCallback: afterCallback,
		beforeCallback: beforeCallback
	};
	this.requests.push (req);

	if (this.sendPaused)
		this.resumeSend ();

	return this;
}

// @ts-expect-error TS(7006): Parameter 'level' implicitly has an 'any' type.
Socket.prototype.setOption = function (level, option, value, length) {
	if (arguments.length > 3)
		this.wrap.setOption (level, option, value, length);
	else
		this.wrap.setOption (level, option, value);
}

// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.createChecksum = function () {
	var sum = 0;
	for (var i = 0; i < arguments.length; i++) {
		var object = arguments[i];
// @ts-expect-error TS(2580): Cannot find name 'Buffer'. Do you need to install ... Remove this comment to see the full error message
		if (object instanceof Buffer) {
			sum = raw.createChecksum (sum, object, 0, object.length);
		} else {
			sum = raw.createChecksum (sum, object.buffer, object.offset,
					object.length);
		}
	}
	return sum;
}

// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.writeChecksum = function (buffer, offset, checksum) {
	buffer.writeUInt8 ((checksum & 0xff00) >> 8, offset);
	buffer.writeUInt8 (checksum & 0xff, offset + 1);
	return buffer;
}

// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.createSocket = function (options) {
// @ts-expect-error TS(7009): 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
	return new Socket (options || {});
};

// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.AddressFamily = AddressFamily;
// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.Protocol = Protocol;

// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.Socket = Socket;

// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.SocketLevel = raw.SocketLevel;
// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.SocketOption = raw.SocketOption;

// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.htonl = raw.htonl;
// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.htons = raw.htons;
// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.ntohl = raw.ntohl;
// @ts-expect-error TS(2304): Cannot find name 'exports'.
exports.ntohs = raw.ntohs;
