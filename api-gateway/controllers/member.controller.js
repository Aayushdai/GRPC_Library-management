const grpc = require("@grpc/grpc-js");
const borrowingClient = require("../clients/borrowing.client");

function handleGrpcError(error, res) {
    const statusMap = {
        [grpc.status.INVALID_ARGUMENT]: 400,
        [grpc.status.NOT_FOUND]: 404,
        [grpc.status.ALREADY_EXISTS]: 409,
        [grpc.status.UNAUTHENTICATED]: 401,
        [grpc.status.PERMISSION_DENIED]: 403,
        [grpc.status.UNAVAILABLE]: 503,
        [grpc.status.INTERNAL]: 500
    };

    const httpStatus = statusMap[error.code] || 500;

    return res.status(httpStatus).json({
        success: false,
        message: error.details || error.message || "Borrowing Service error."
    });
}

function registerMember(req, res) {
    const { name, email, phone } = req.body || {};

    // Validate required fields.
    if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: "Name and email are required."
        });
    }

    // Prepare the gRPC request.
    const memberData = {
        name: name.trim(),
        email: email.trim(),
        phone: typeof phone === "string" ? phone.trim() : ""
    };

    // Call the Borrowing Service.
    borrowingClient.registerMember(memberData, (error, member) => {
        if (error) {
            return handleGrpcError(error, res);
        }

        return res.status(201).json({
            success: true,
            message: "Member registered successfully.",
            data: member
        });
    });
}

function listMembers(req, res) {
    borrowingClient.listMembers({}, (error, result) => {
        if (error) {
            return handleGrpcError(error, res);
        }

        return res.status(200).json({
            success: true,
            count: result.members.length,
            data: result.members
        });
    });
}

function getMember(req,res){
    const memberId = Number(req.params.id);

    if(!Number.isInteger(memberId)|| memberId<=0){
        return res.status(400).json({
            success: false,
            message: "Invalid member ID."
        });
    }

    borrowingClient.getMember({id: memberId}, (error, member)=>{
        if(error){
            return handleGrpcError(error,res);
        }
        return res.status(200).json({
            success: true,
            data: member
        });
    });

}

module.exports = {
    registerMember,
    listMembers,
    getMember
};