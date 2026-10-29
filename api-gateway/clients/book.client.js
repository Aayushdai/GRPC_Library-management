
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoPath = path.join(__dirname, "../../proto/book.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

// Load the book package from the protobuf definition
const bookProto = grpc.loadPackageDefinition(packageDefinition).book;

// Create the gRPC client
const bookClient = new bookProto.BookService(
    `127.0.0.1:${process.env.BOOK_SERVICE_PORT || 50051}`,
    grpc.credentials.createInsecure()
);

module.exports = bookClient;
