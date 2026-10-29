const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const protoPath = path.join(__dirname, '../../../proto/book.proto');

const packageDefination = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const bookProto = grpc.loadPackageDefinition(packageDefination).book;

const bookClient = new bookProto.BookService(
    `127.0.0.1:${process.env.BOOK_SERVICE_PORT || 50051}`,
    grpc.credentials.createInsecure()
);
module.exports = bookClient;