import { EventEmitter } from "events";
import { isIP } from "net";
const raw = require("../build/Release/raw.node");

export enum AddressFamily {
  IPv4 = 1,
  IPv6 = 2,
}

export enum Protocol {
  "None" = 0,
  "SOL_SOCKET" = 0,
  "ICMP" = 1,
  "TCP" = 2,
  "UDP" = 17,
  "ICMPv6" = 58,
}

(
  Object.keys(EventEmitter.prototype) as (keyof typeof EventEmitter.prototype)[]
).forEach((key) => {
  raw.SocketWrap.prototype[key] = EventEmitter.prototype[key];
});

type SocketOptions = {
  bufferSize?: number;
  protocol?: Protocol;
  addressFamily?: AddressFamily;
};

type ErrorCallback = (this: RawSocket, error: Error, bytes?: unknown) => void;
type SuccessCallback = (this: RawSocket, error: null, bytes: number) => void;
type AfterCallback = ErrorCallback | SuccessCallback;

type BeforeCallback = () => void;

type SocketRequest = {
  buffer: Buffer;
  offset: number;
  length: number;
  address: string;
  beforeCallback?: BeforeCallback;
  afterCallback: AfterCallback;
};

export class RawSocket extends EventEmitter {
  private requests: SocketRequest[];
  private buffer: Buffer;
  private recvPaused: boolean;
  private sendPaused: boolean;
  private wrap: typeof raw.SocketWrap;

  constructor(options: SocketOptions = {}) {
    super();
    this.requests = [];

    this.buffer = Buffer.alloc(
      options && options.bufferSize ? options.bufferSize : 4096
    );

    this.recvPaused = false;
    this.sendPaused = true;

    this.wrap = new raw.SocketWrap(
      options.protocol ?? Protocol.None,
      options.addressFamily ?? AddressFamily.IPv4
    );

    this.wrap.on("sendReady", this.onSendReady.bind(this));
    this.wrap.on("recvReady", this.onRecvReady.bind(this));
    this.wrap.on("error", this.onError.bind(this));
    this.wrap.on("close", this.onClose.bind(this));
  }

  close() {
    this.wrap.close();
    return this;
  }

  /**
   *
   * @param level
   * @param option
   * @param value
   * @param length
   * @returns
   */
  getOption(
    level: typeof SocketLevel,
    option: typeof SocketOption,
    value: any,
    length: number
  ) {
    return this.wrap.getOption(level, option, value, length);
  }

  /**
   *
   * @param level
   * @param option
   * @param value
   * @param length
   */
  setOption(
    level: typeof SocketLevel,
    option: typeof SocketOption,
    value: any,
    length?: number
  ) {
    if (length !== undefined) {
      this.wrap.setOption(level, option, value, length);
    } else {
      this.wrap.setOption(level, option, value);
    }
  }

  private onClose() {
    this.emit("close");
  }

  private onError(error: Error) {
    this.emit("error", error);
    this.close();
  }

  private onRecvReady() {
    try {
      this.wrap.recv(
        this.buffer,
        (buffer: Buffer, bytes: number, source: string) => {
          var newBuffer = buffer.slice(0, bytes);
          this.emit("message", newBuffer, source);
        }
      );
    } catch (error) {
      this.emit("error", error);
    }
  }

  private onSendReady() {
    let req: SocketRequest | undefined;
    while ((req = this.requests.shift()) !== undefined) {
      const { buffer, offset, length, beforeCallback, afterCallback } = req;
      try {
        if (beforeCallback) {
          beforeCallback();
        }
        this.wrap.send(buffer, offset, length, req.address, (bytes: number) => {
          (afterCallback as SuccessCallback).call(this, null, bytes);
        });
      } catch (error) {
        if (error instanceof Error) {
          (afterCallback as ErrorCallback).call(this, error);
        }
      }
    }

    if (!this.sendPaused) {
      this.pauseSend();
    }
  }

  pauseRecv() {
    this.recvPaused = true;
    this.wrap.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  pauseSend() {
    this.sendPaused = true;
    this.wrap.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  resumeRecv() {
    this.recvPaused = false;
    this.wrap.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  resumeSend() {
    this.sendPaused = false;
    this.wrap.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  send(
    buffer: Buffer,
    offset: number,
    length: number,
    address: string,
    beforeCallback: AfterCallback
  ): void;
  send(
    buffer: Buffer,
    offset: number,
    length: number,
    address: string,
    beforeCallback: BeforeCallback,
    afterCallback: AfterCallback
  ): void;
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
  send(
    buffer: Buffer,
    offset: number,
    length: number,
    address: string,
    beforeCallback: BeforeCallback | AfterCallback,
    afterCallback?: AfterCallback
  ) {
    const before =
      afterCallback !== undefined ? (beforeCallback as BeforeCallback) : null;
    const after =
      afterCallback !== undefined
        ? afterCallback
        : (beforeCallback as AfterCallback);

    if (length + offset > buffer.length) {
      (after as ErrorCallback).call(
        this,
        new Error(
          `Buffer length '${buffer.length}' is not large enough for the specified offset '${offset}' plus length '${length}'`
        )
      );
      return this;
    }

    if (!isIP(address)) {
      (after as ErrorCallback).call(
        this,
        new Error(`Invalid IP address '${address}'`)
      );
      return this;
    }

    const req: SocketRequest = {
      buffer: buffer,
      offset: offset,
      length: length,
      address: address,
      afterCallback: after,
      ...(before === null ? {} : { beforeCallback: before }),
    };
    this.requests.push(req);

    if (this.sendPaused) this.resumeSend();

    return this;
  }
}

export const createChecksum = (
  ...objects: (Buffer | { buffer: Buffer; offset: number; length: number })[]
) =>
  objects.reduce((acc, object) => {
    if (object instanceof Buffer) {
      return raw.createChecksum(acc, object, 0, object.length);
    } else {
      return raw.createChecksum(
        acc,
        object.buffer,
        object.offset,
        object.length
      );
    }
  }, 0);

export const writeChecksum = (
  buffer: Buffer,
  offset: number,
  checksum: number
) => {
  buffer.writeUInt8((checksum & 0xff00) >> 8, offset);
  buffer.writeUInt8(checksum & 0xff, offset + 1);
  return buffer;
};

export const createSocket = function (options: SocketOptions = {}) {
  return new RawSocket(options);
};

export const SocketLevel = raw.SocketLevel;
export const SocketOption = raw.SocketOption;

console.log(SocketLevel);

export const htonl = raw.htonl;
export const htons = raw.htons;
export const ntohl = raw.ntohl;
export const ntohs = raw.ntohs;
