const grpc = require('@grpc/grpc-js');
const { sequelize, Member, Borrowing} = require('../models');
const bookClient = require('../clients/book.client');

function callBookService(method, request){
    return new Promise((resolve, reject) => {
        bookClient[method](request, (error, response) => {
            if(error){
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}
function toMemberResponse(member){
    return {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString()
    };
}
function toBorrowingResponse(borrowing){
    return {
        id: borrowing.id,
        memberId: borrowing.memberId,
        bookId: borrowing.bookId,
        borrowedAt: borrowing.borrowedAt.toISOString(),
        dueAt: borrowing.dueAt.toISOString(),
        returnedAt: borrowing.returnedAt
        ? borrowing.returnedAt.toISOString()
        : '',
        status: borrowing.status,
        createdAt: borrowing.createdAt.toISOString(),
        updatedAt: borrowing.updatedAt.toISOString()
    };
}

function sendError(callback, error, fallbackMessage){
    callback({
        code: error.code ?? grpc.status.INTERNAL,
        message:error.code !== undefined
        ? error.details || error.message
        : fallbackMessage
    });
    }

async function registerMember(call, callback){
    try{
        const { name, email, phone} = call.request;

        if(!name?.trim() || !email?.trim()){
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Name and email are required."
            });
    }
    const member = await Member.create({
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null
    });
    callback(null, toMemberResponse(member));
    }catch(error){
        if (error.name === 'SequelizeUniqueConstraintError') {
    return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'A member with this email already exists.'
    });
}

        if(error.name === 'SequelizeValidationError'){
            return callback ({
                code: grpc.status.INVALID_ARGUMENT,
                message: error.errors.map(item => item.message).join(',')
            })
        }

        console.error('Register member error:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to register member.'
        });
    }
}

async function getMember(call, callback){
    try{
        const member = await Member.findByPk(Number(call.request.id));
        if(!member){
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'Member not found.'
            });
        }
        callback(null, toMemberResponse(member));
    }catch(error){
        console.error('Get member error:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to get member.'
        });
    }

}

async function listMembers(call, callback){
    try {
        const members = await Member.findAll({
            order: [['id','ASC']]
        });
        callback(null, {
            members: members.map(toMemberResponse)
        });
    }catch(error){
        console.error('List members error:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to list members.'
        });
    }
}

async function borrowBook(call, callback){
    let reserved = false;
    let bookId;

    try{
        const memberId = Number(call.request.memberId);
        bookId = Number(call.request.bookId);
        const dueAt = new Date(call.request.dueAt);

        if(
            !Number.isInteger(memberId) || memberId <=0 ||
            !Number.isInteger(bookId) || bookId <=0 ||
            !call.request.dueAt ||
            Number.isNaN(dueAt.getTime()) ||
            dueAt <= new Date()
        ){
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: 'Invalid memberId, bookId, or dueAt.'
            });
        }
        const member = await Member.findByPk(memberId);

        if(!member){
            return callback ({
                code: grpc.status.NOT_FOUND,
                message: 'Member not found.'
            });
        }
        await callBookService('reserveBook', {id: bookId});
        reserved = true;

        const borrowing = await Borrowing.create({
            memberId,
            bookId,
            dueAt,
            status: 'borrowed'
        });
        callback(null, toBorrowingResponse(borrowing));
    }catch(error) {
        if(reserved) {
            try{
                await callBookService('releaseBook', {id: bookId});
            }catch (compensationError){
                console.error(
                    'Inventory compensation failed:',
                    compensationError.message
                );
            }
        }

        console.error('Borrow book error:', error);
        sendError(callback, error, 'Failed to borrow book.');
    }
}

async function returnBook(call, callback){
    const borrowingId = Number(call.request.borrowingId);

    if(!Number.isInteger(borrowingId) || borrowingId <=0){
        return callback ({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'A valid borrowing ID is required.'
        });
    }
    const transaction = await sequelize. transaction();
    let borrowing;
    let inventoryReleased = false;

    try{
        borrowing = await Borrowing.findByPk(borrowingId, 
            {transaction, lock: transaction.LOCK.UPDATE});
            
        if(!borrowing){
            await transaction.rollback();
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'Borrowing record not found.'
            });
        }

        if(borrowing.status !== 'borrowed'){
            await transaction.rollback();
            return callback({
                code: grpc.status.FAILED_PRECONDITION,
                message: 'This book has already been returned.'
            });
        }
        borrowing.status ='returned';
        borrowing.returnedAt = new Date();
        await borrowing.save({transaction});

        await callBookService('releaseBook', {id: borrowing.bookId});
        inventoryReleased = true;

        await transaction.commit();
        callback(null, toBorrowingResponse(borrowing));
    }catch(error){
        if(!transaction.finished){
            await transaction.rollback();
        }

        if(inventoryReleased && borrowing){
            try{
                await callBookService('reserveBook', {id: borrowing.bookId});
            }catch (compensationError){
                console.error(
                    'Inventory compensation failed:',
                    compensationError.message
                );
            }
        }
        console.error('Return book error:', error);
        sendError(callback, error, 'Failed to return book.');
    }
}

async function getBorrowing(call, callback){
    try{
        const borrowing = await Borrowing.findByPk(Number(call.request.id));

        if(!borrowing){
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'Borrowing record not found.'
            });
        }
        callback(null,toBorrowingResponse(borrowing));
    }catch(error) {
        console.error('Get borrowing error:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Failed to get borrowing record.'
            });
        }
    }

    async function listBorrowings(call, callback){
        try{
            const borrowings = await Borrowing.findAll({
                order: [['id','DESC']]
            });

            callback(null, {
                borrowings: borrowings.map(toBorrowingResponse)
            });
        }catch(error) {
            console.error('List borrowings error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to list borrowings.'
            });
        }
    }

    async function listMemberBorrowings(call, callback){
        try {
            const memberId = Number(call.request.id);
            const member = await Member.findByPk(memberId);
            if(!member){
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Member not found.'
                });
            }
            const borrowings = await Borrowing.findAll({
                where: { memberId },
                order: [['id','DESC']]
            });

            callback(null, {
                borrowings: borrowings.map(toBorrowingResponse)
            });

        }catch(error){
            console.error('List member borrowings error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to list member borrowings.'
            });
        }
        }

        module.exports = {
            registerMember,
            getMember,
            getBorrowing,
            listBorrowings,
            returnBook,
            listMembers,
            borrowBook,
            listMemberBorrowings
        };