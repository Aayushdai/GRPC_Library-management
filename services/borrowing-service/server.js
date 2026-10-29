require('dotenv').config();

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const { sequelize } = require('./models');
const borrowingHandler = require('./handlers/borrowing.handler');

const protoPath = path.join(
    __dirname,
    '../../proto/borrowing.proto'
);

const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const borrowingProto =
    grpc.loadPackageDefinition(packageDefinition).borrowing;
    
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Borrowing Service database connected.');

        const server = new grpc.Server();

        server.addService(
            borrowingProto.BorrowingService.service,
            {
                registerMember: borrowingHandler.registerMember,
                getMember: borrowingHandler.getMember,
                listMembers: borrowingHandler.listMembers,
                borrowBook: borrowingHandler.borrowBook,
                returnBook: borrowingHandler.returnBook,
                listBorrowings: borrowingHandler.listBorrowings,
                getBorrowing: borrowingHandler.getBorrowing,
                listMemberBorrowings: borrowingHandler.listMemberBorrowings
            }
        );
        const port = Number(
            process.env.BORROWING_SERVICE_PORT || 50052
        );
        server.bindAsync(
            `127.0.0.1:${port}`,
            grpc.ServerCredentials.createInsecure(),
            (error, boundPort) => {
                if (error) {
                    console.error(
                        'Failed to start Borrowing Service gRPC server:',
                        error.message
                    );
                    return;
                }
                console.log(
                    `Borrowing Service gRPC server running on port ${boundPort}`
                );
            }
        );
    }catch (error) {
        console.error(
            'Failed to start Borrowing Service:',
            error.message
        );
        process.exitCode = 1;
    }
}

startServer();