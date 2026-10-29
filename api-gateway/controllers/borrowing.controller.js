const grpc= require("@grpc/grpc-js");
const borrowingClient = require("../clients/borrowing.client");

function handleGrpcError(error, res) {
    const statusMap = {
        [grpc.status.INVALID_ARGUMENT]: 400,
        [grpc.status.NOT_FOUND]: 404,
        [grpc.status.FAILED_PRECONDITION]: 409,
        [grpc.status.ALREADY_EXISTS]: 409,
        [grpc.status.UNAUTHENTICATED]: 401,
        [grpc.status.PERMISSION_DENIED]: 403,
        [grpc.status.UNAVAILABLE]: 503,
        [grpc.status.INTERNAL]: 500
        };

        return res.status(statusMap[error.code] || 500).json({
            success: false,
            message: error.details || error.message || "Borrowing Service error."
        });
    }

function borrowBook(req,res) {
console.log("Incoming request:", {
    method: req.method,
    url: req.originalUrl,
    contentType: req.headers["content-type"],
    contentLength: req.headers["content-length"]
});    const {memberId, bookId, dueAt} = req.body || {};

    const parsedMemberId = Number(memberId);
    const parsedBookId = Number(bookId);
    const parsedDueAt = new Date(dueAt);

    if(
        !Number.isInteger(parsedMemberId) || parsedMemberId <= 0 ||
        !Number.isInteger(parsedBookId) || parsedBookId <= 0 ||
        typeof dueAt !== "string" ||
        !dueAt.trim() ||
        Number.isNaN(parsedDueAt.getTime()) ||
        parsedDueAt <= new Date()
    ){
        console.log("Request body:", req.body);
console.log("memberId:", memberId, typeof memberId);
console.log("bookId:", bookId, typeof bookId);
console.log("dueAt:", dueAt, typeof dueAt);
console.log("parsedMemberId:", parsedMemberId);
console.log("parsedBookId:", parsedBookId);
console.log("parsedDueAt:", parsedDueAt);
        return res.status(400).json(
            {
            success: false,
            message: "memberId, bookId, and dueAt are required and must be valid."
        });
    }
    borrowingClient.borrowBook(
        {
            memberId: parsedMemberId,
            bookId: parsedBookId,
            dueAt: parsedDueAt.toISOString()
        },
        (error, borrowing) => {
            if(error) {
                return handleGrpcError(error, res);
            }
            return res.status(201).json({
                success: true,
                message: "Booking borrowed successfully.",
                data: borrowing
            });
        }
    );
}

function listBorrowings(req,res){
    borrowingClient.listBorrowings({}, (error, result)=>{
        if(error){
            return handleGrpcError(error,res);
        }
        return res.status(200).json({
            success: true,
            message: "Borrowings retrieved successfully.",
            data: result.borrowings
        });
    });
}

function getBorrowing(req,res){
    const id = Number(req.params.id);

    if(!Number.isInteger(id) || id <=0){
        return res.status(400).json({
            success: false,
            message: "Borrowing ID must be a positive integer."
        });
    }
    borrowingClient.getBorrowing({id}, (error, borrowing) => {
        if(error){
            return handleGrpcError(error, res);
        }
        return res.status(200).json({
            success: true,
            message: "Borrowing retrieved successfully.",
            data: borrowing
        });
    });
}

function returnBook(req,res){
    const borrowingId = Number(req.params.id);
    
    if(!Number.isInteger(borrowingId) || borrowingId <= 0){
        return res.status(400).json({
            success: false,
            message: "Borrowing ID must be a positive integer."
    });
}
borrowingClient.returnBook(
    { borrowingId},
    (error, borrowing) => {
        if(error){
            return handleGrpcError(error, res);
        }

        return res.status(200).json({
            success: true,
            message: "Book returned successfully.",
            data: borrowing
        });
    }
);
}




module.exports = {
    borrowBook,
    listBorrowings,
    getBorrowing,
    returnBook
};