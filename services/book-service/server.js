require("dotenv").config();

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const { sequelize } = require("./models");
const bookHandler = require("./handlers/book.handler");

// Load the gRPC contract
const protoPath = path.join(__dirname, "../../proto/book.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const bookProto = grpc.loadPackageDefinition(packageDefinition).book;

async function startServer() {
    try {
        // Connect to the database
        await sequelize.authenticate();
        console.log("Book Service database connected.");

        const server = new grpc.Server();

        // Register the Book Service methods
        server.addService(bookProto.BookService.service, {
            addBook: bookHandler.addBook,
            getBook: bookHandler.getBook,
            listBooks: bookHandler.listBooks,
            listAvailableBooks: bookHandler.listAvailableBooks,
            updateBook: bookHandler.updateBook,
            removeBook: bookHandler.removeBook,
            reserveBook: bookHandler.reserveBook,
            releaseBook: bookHandler.releaseBook
        });

        const port = Number(process.env.BOOK_SERVICE_PORT || 50051);

        // Start the gRPC server
        server.bindAsync(
            `127.0.0.1:${port}`,
            grpc.ServerCredentials.createInsecure(),
            (error, boundPort) => {
                if (error) {
                    console.error(
                        "Failed to start Book Service gRPC server:",
                        error.message
                    );
                    process.exitCode = 1;
                    return;
                }

                console.log(
                    `Book Service gRPC server running on port ${boundPort}`
                );
            }
        );
    } catch (error) {
        console.error(
            "Failed to start Book Service:",
            error.message
        );

        process.exitCode = 1;
    }
}

startServer();