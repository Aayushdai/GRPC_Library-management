
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoPath = path.join(__dirname, "../proto/book.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const bookProto = grpc.loadPackageDefinition(packageDefinition).book;

const client = new bookProto.BookService(
    "127.0.0.1:50051",
    grpc.credentials.createInsecure()
);
console.log("Available RPC methods:", Object.keys(Object.getPrototypeOf(client)));

const testISBN = `TEST-${Date.now()}`;

function callRpc(method, request) {
    return new Promise((resolve, reject) => {
        client[method](request, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

async function runTests() {
    let bookId;

    try {
        // 1. AddBook
        const created = await callRpc("addBook", {
            title: "Automated Test Book",
            author: "Test Author",
            isbn: testISBN,
            totalCopies: 5
        });

        bookId = created.id;
        console.log("PASS: AddBook");

        // 2. GetBook
        const fetched = await callRpc("getBook", { id: bookId });

        if (fetched.id !== bookId) {
            throw new Error("GetBook returned the wrong book");
        }
        console.log("PASS: GetBook");

        // 3. ListBooks
        const allBooks = await callRpc("listBooks", {});
        if (!allBooks.books.some(book => book.id === bookId)) {
            throw new Error("New book missing from ListBooks");
        }
        console.log("PASS: ListBooks");

        // 4. ListAvailableBooks
        const availableBooks = await callRpc("listAvailableBooks", {});
        if (!availableBooks.books.some(book => book.id === bookId)) {
            throw new Error("New book missing from ListAvailableBooks");
        }
        console.log("PASS: ListAvailableBooks");

        // 5. UpdateBook
        const updated = await callRpc("updateBook", {
            id: bookId,
            title: "Automated Test Book Updated",
            author: "Test Author",
            isbn: testISBN,
            totalCopies: 5
        });

        if (updated.title !== "Automated Test Book Updated") {
            throw new Error("UpdateBook did not update the title");
        }
        console.log("PASS: UpdateBook");

        // 6. RemoveBook
        const removed = await callRpc("removeBook", { id: bookId });

        if (!removed.success) {
            throw new Error("RemoveBook did not confirm success");
        }
        console.log("PASS: RemoveBook");

        // Verify removal
        try {
            await callRpc("getBook", { id: bookId });
            throw new Error("Removed book was still retrievable");
        } catch (error) {
            if (error.message === "Removed book was still retrievable") {
                throw error;
            }

            if (error.code !== grpc.status.NOT_FOUND) {
                throw error;
            }
        }

        console.log("PASS: Removed book is no longer retrievable");
        console.log("\nAll Book Service gRPC tests passed.");
    } catch (error) {
        console.error("\nTEST FAILED:", error.message);
        process.exitCode = 1;

        // Best-effort cleanup if the test created a book.
        if (bookId !== undefined) {
            try {
                await callRpc("removeBook", { id: bookId });
            } catch {
                // Preserve the original test failure.
            }
        }
    } finally {
        client.close();
    }
}

runTests();
