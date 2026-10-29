const grpc = require("@grpc/grpc-js");
const bookClient = require("../clients/book.client.js");

function handleGrpcError(error, res) {
    if(!error) return false;

    const statusMap = {
        [grpc.status.INVALID_ARGUMENT]: 400,
        [grpc.status.NOT_FOUND]: 404,
        [grpc.status.ALREADY_EXISTS]: 409,
        [grpc.status.UNAUTHENTICATED]: 401,
        [grpc.status.INTERNAL]: 500,
        [grpc.status.UNAVAILABLE]: 503
    };

    res.status(statusMap[error.code] || 500).json({
        success: false,
        message: error.message || "Internal server error"    
    });
    return true;
}


exports.addBook = (req, res) => {
    const { title, author, isbn, totalCopies } = req.body;

    if (
        typeof title !== "string" || !title.trim() ||
        typeof author !== "string" || !author.trim() ||
        !Number.isInteger(totalCopies) || totalCopies < 1
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid input data"
        });
    }

    bookClient.addBook(
        {
            title: title.trim(),
            author: author.trim(),
            isbn: isbn || "",
            totalCopies
        },
        (error, response) => {
            if (handleGrpcError(error, res)) return;

            res.status(201).json({
                success: true,
                message: "Book added successfully",
                data: response
            });
        }
    );
};

exports.getBook = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            success: false,
            message: "Invalid book ID"
        });
    }

    bookClient.getBook({ id }, (error, response) => {
        if (handleGrpcError(error, res)) return;

        res.json({ success: true, data: response });
    });
};

exports.listBooks = (req, res) => {
    bookClient.listBooks({}, (error, response) => {
        if (handleGrpcError(error, res)) return;

        res.json({
            success: true,
            count: response.books.length,
            data: response.books
        });
    });
};

exports.listAvailableBooks = (req, res) => {
    bookClient.listAvailableBooks({}, (error, response) => {
        if (handleGrpcError(error, res)) return;

        res.json({
            success: true,
            count: response.books.length,
            data: response.books
        });
    });
};

exports.updateBook = (req, res) => {
    const id = Number(req.params.id);
    const { title, author, isbn, totalCopies } = req.body;

    if (
        !Number.isInteger(id) || id < 1 ||
        typeof title !== "string" || !title.trim() ||
        typeof author !== "string" || !author.trim() ||
        !Number.isInteger(totalCopies) || totalCopies < 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid book data"
        });
    }

    bookClient.updateBook(
        {
            id,
            title: title.trim(),
            author: author.trim(),
            isbn: isbn || "",
            totalCopies
        },
        (error, response) => {
            if (handleGrpcError(error, res)) return;

            res.json({
                success: true,
                message: "Book updated successfully",
                data: response
            });
        }
    );
};

exports.removeBook = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            success: false,
            message: "Invalid book ID"
        });
    }

    bookClient.removeBook({ id }, (error, response) => {
        if (handleGrpcError(error, res)) return;

        res.json(response);
    });
};
