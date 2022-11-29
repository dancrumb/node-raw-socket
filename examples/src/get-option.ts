import {
  createSocket,
  Protocol,
  SocketLevel,
  SocketOption,
} from "@dancrumb/raw-socket";

if (process.argv.length < 4) {
  console.log("node get-option <name> <option>");
  process.exit(-1);
}

const levelArg = process.argv[2] ?? "0";
const optionArg = process.argv[3] ?? "0";

const level: typeof SocketLevel =
  SocketLevel[levelArg] || (parseInt(levelArg) as typeof SocketLevel);
const option = SocketOption[optionArg] || parseInt(optionArg);

var options = {
  protocol: Protocol.ICMP,
};

var socket = createSocket(options);

var buffer = Buffer.alloc(4096);
var len = socket.getOption(level, option, buffer, buffer.length);

socket.pauseSend().pauseRecv();

console.log(buffer.toString("hex", 0, len));
