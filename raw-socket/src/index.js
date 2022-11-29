"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.ntohs = exports.ntohl = exports.htons = exports.htonl = exports.SocketOption = exports.SocketLevel = exports.createSocket = exports.writeChecksum = exports.createChecksum = exports.RawSocket = exports.Protocol = exports.AddressFamily = void 0;
var events_1 = require("events");
var net_1 = require("net");
var raw = require("../build/Release/raw.node");
var AddressFamily;
(function (AddressFamily) {
    AddressFamily[AddressFamily["IPv4"] = 1] = "IPv4";
    AddressFamily[AddressFamily["IPv6"] = 2] = "IPv6";
})(AddressFamily = exports.AddressFamily || (exports.AddressFamily = {}));
var Protocol;
(function (Protocol) {
    Protocol[Protocol["None"] = 0] = "None";
    Protocol[Protocol["SOL_SOCKET"] = 0] = "SOL_SOCKET";
    Protocol[Protocol["ICMP"] = 1] = "ICMP";
    Protocol[Protocol["TCP"] = 2] = "TCP";
    Protocol[Protocol["UDP"] = 17] = "UDP";
    Protocol[Protocol["ICMPv6"] = 58] = "ICMPv6";
})(Protocol = exports.Protocol || (exports.Protocol = {}));
Object.keys(events_1.EventEmitter.prototype).forEach(function (key) {
    raw.SocketWrap.prototype[key] = events_1.EventEmitter.prototype[key];
});
var RawSocket = /** @class */ (function (_super) {
    __extends(RawSocket, _super);
    function RawSocket(options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        var _a, _b;
        _this = _super.call(this) || this;
        _this.requests = [];
        _this.buffer = Buffer.alloc(options && options.bufferSize ? options.bufferSize : 4096);
        _this.recvPaused = false;
        _this.sendPaused = true;
        _this.wrap = new raw.SocketWrap((_a = options.protocol) !== null && _a !== void 0 ? _a : Protocol.None, (_b = options.addressFamily) !== null && _b !== void 0 ? _b : AddressFamily.IPv4);
        _this.wrap.on("sendReady", _this.onSendReady.bind(_this));
        _this.wrap.on("recvReady", _this.onRecvReady.bind(_this));
        _this.wrap.on("error", _this.onError.bind(_this));
        _this.wrap.on("close", _this.onClose.bind(_this));
        return _this;
    }
    RawSocket.prototype.close = function () {
        this.wrap.close();
        return this;
    };
    /**
     *
     * @param level
     * @param option
     * @param value
     * @param length
     * @returns
     */
    RawSocket.prototype.getOption = function (level, option, value, length) {
        return this.wrap.getOption(level, option, value, length);
    };
    /**
     *
     * @param level
     * @param option
     * @param value
     * @param length
     */
    RawSocket.prototype.setOption = function (level, option, value, length) {
        if (length !== undefined) {
            this.wrap.setOption(level, option, value, length);
        }
        else {
            this.wrap.setOption(level, option, value);
        }
    };
    RawSocket.prototype.onClose = function () {
        this.emit("close");
    };
    RawSocket.prototype.onError = function (error) {
        this.emit("error", error);
        this.close();
    };
    RawSocket.prototype.onRecvReady = function () {
        var _this = this;
        try {
            this.wrap.recv(this.buffer, function (buffer, bytes, source) {
                var newBuffer = buffer.slice(0, bytes);
                _this.emit("message", newBuffer, source);
            });
        }
        catch (error) {
            this.emit("error", error);
        }
    };
    RawSocket.prototype.onSendReady = function () {
        var _this = this;
        var req;
        var _loop_1 = function () {
            var buffer = req.buffer, offset = req.offset, length_1 = req.length, beforeCallback = req.beforeCallback, afterCallback = req.afterCallback;
            try {
                if (beforeCallback) {
                    beforeCallback();
                }
                this_1.wrap.send(buffer, offset, length_1, req.address, function (bytes) {
                    afterCallback.call(_this, null, bytes);
                });
            }
            catch (error) {
                if (error instanceof Error) {
                    afterCallback.call(this_1, error);
                }
            }
        };
        var this_1 = this;
        while ((req = this.requests.shift()) !== undefined) {
            _loop_1();
        }
        if (!this.sendPaused) {
            this.pauseSend();
        }
    };
    RawSocket.prototype.pauseRecv = function () {
        this.recvPaused = true;
        this.wrap.pause(this.recvPaused, this.sendPaused);
        return this;
    };
    RawSocket.prototype.pauseSend = function () {
        this.sendPaused = true;
        this.wrap.pause(this.recvPaused, this.sendPaused);
        return this;
    };
    RawSocket.prototype.resumeRecv = function () {
        this.recvPaused = false;
        this.wrap.pause(this.recvPaused, this.sendPaused);
        return this;
    };
    RawSocket.prototype.resumeSend = function () {
        this.sendPaused = false;
        this.wrap.pause(this.recvPaused, this.sendPaused);
        return this;
    };
    /**
     *
     * @param buffer
     * @param offset
     * @param length
     * @param address
     * @param beforeCallback
     * @param afterCallback
     * @returns
     */
    RawSocket.prototype.send = function (buffer, offset, length, address, beforeCallback, afterCallback) {
        var before = afterCallback !== undefined ? beforeCallback : null;
        var after = afterCallback !== undefined
            ? afterCallback
            : beforeCallback;
        if (length + offset > buffer.length) {
            after.call(this, new Error("Buffer length '".concat(buffer.length, "' is not large enough for the specified offset '").concat(offset, "' plus length '").concat(length, "'")));
            return this;
        }
        if (!(0, net_1.isIP)(address)) {
            after.call(this, new Error("Invalid IP address '".concat(address, "'")));
            return this;
        }
        var req = __assign({ buffer: buffer, offset: offset, length: length, address: address, afterCallback: after }, (before === null ? {} : { beforeCallback: before }));
        this.requests.push(req);
        if (this.sendPaused)
            this.resumeSend();
        return this;
    };
    return RawSocket;
}(events_1.EventEmitter));
exports.RawSocket = RawSocket;
var createChecksum = function () {
    var objects = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        objects[_i] = arguments[_i];
    }
    return objects.reduce(function (acc, object) {
        if (object instanceof Buffer) {
            return raw.createChecksum(acc, object, 0, object.length);
        }
        else {
            return raw.createChecksum(acc, object.buffer, object.offset, object.length);
        }
    }, 0);
};
exports.createChecksum = createChecksum;
var writeChecksum = function (buffer, offset, checksum) {
    buffer.writeUInt8((checksum & 0xff00) >> 8, offset);
    buffer.writeUInt8(checksum & 0xff, offset + 1);
    return buffer;
};
exports.writeChecksum = writeChecksum;
var createSocket = function (options) {
    if (options === void 0) { options = {}; }
    return new RawSocket(options);
};
exports.createSocket = createSocket;
exports.SocketLevel = raw.SocketLevel;
exports.SocketOption = raw.SocketOption;
console.log(exports.SocketLevel);
exports.htonl = raw.htonl;
exports.htons = raw.htons;
exports.ntohl = raw.ntohl;
exports.ntohs = raw.ntohs;
