const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoPath = path.join(__dirname, "../../proto/borrowing.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const borrowingProto =
    grpc.loadPackageDefinition(packageDefinition).borrowing;

const borrowingClient = new borrowingProto.BorrowingService(
    `127.0.0.1:${process.env.BORROWING_SERVICE_PORT || 50052}`,
    grpc.credentials.createInsecure()
);

module.exports = borrowingClient;