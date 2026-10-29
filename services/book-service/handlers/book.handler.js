const grpc = require("@grpc/grpc-js");
const { Op } = require("sequelize");
const { Book } = require("../models");

// Add a new book
function addBook(call, callback) {
    const { title, author, isbn, totalCopies } = call.request;

    Book.create({
        title,
        author,
        isbn: isbn || null,
        totalCopies,
        availableCopies: totalCopies
    })
        .then(book => {
            callback(null, book.toJSON());
        })
        .catch(error => {
            callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: error.message
            });
        });
}

// Get a book by ID
function getBook(call, callback) {
    Book.findByPk(call.request.id)
        .then(book => {
            if (!book) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: "Book not found"
                });
            }

            callback(null, book.toJSON());
        })
        .catch(error => {
            callback({
                code: grpc.status.INTERNAL,
                message: "Failed to retrieve book"
            });
        });
}

// Get all books
function listBooks(call, callback) {
    Book.findAll()
        .then(books => {
            callback(null, {
                books: books.map(book => book.toJSON())
            });
        })
        .catch(error => {
            callback({
                code: grpc.status.INTERNAL,
                message: "Failed to retrieve books"
            });
        });
}

// Get books with at least one available copy
function listAvailableBooks(call, callback) {
    Book.findAll({
        where: {
            availableCopies: {
                [Op.gt]: 0
            }
        }
    })
        .then(books => {
            callback(null, {
                books: books.map(book => book.toJSON())
            });
        })
        .catch(error => {
            callback({
                code: grpc.status.INTERNAL,
                message: "Failed to retrieve available books"
            });
        });
}

// Update a book
function updateBook(call, callback) {
    const { id, title, author, isbn, totalCopies } = call.request;

    Book.findByPk(id)
        .then(async book => {
            if (!book) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: "Book not found"
                });
            }

            // Calculate how many copies are currently borrowed
            const borrowedCopies =
                book.totalCopies - book.availableCopies;

            // Do not allow the total to drop below borrowed copies
            if (totalCopies < borrowedCopies) {
                return callback({
                    code: grpc.status.FAILED_PRECONDITION,
                    message:
                        "Total copies cannot be less than the number of borrowed copies"
                });
            }

            // Update the book while preserving borrowed-copy counts
            await book.update({
                title,
                author,
                isbn: isbn || null,
                totalCopies,
                availableCopies: totalCopies - borrowedCopies
            });

            callback(null, book.toJSON());
        })
        .catch(error => {
            callback({
                code: grpc.status.INTERNAL,
                message: "Failed to update book"
            });
        });
}

// Remove a book only when none of its copies are borrowed
function removeBook(call, callback) {
    Book.findByPk(call.request.id)
        .then(async book => {
            if (!book) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: "Book not found"
                });
            }

            if (book.availableCopies !== book.totalCopies) {
                return callback({
                    code: grpc.status.FAILED_PRECONDITION,
                    message:
                        "Cannot remove a book while copies are borrowed"
                });
            }

            await book.destroy();

            callback(null, {
                success: true,
                message: "Book removed successfully"
            });
        })
        .catch(error => {
            callback({
                code: grpc.status.INTERNAL,
                message: "Failed to remove book"
            });
        });
}

async function reserveBook(call, callback) {
    try{
        const bookId = Number(call.request.id);

        if(!Number.isInteger(bookId) || bookId <=0){
            return callback ({
                code: 3,
                message: 'A valid book ID is required.'
            });
        }

        const [updatedRows] = await Book.update(
            {
                availableCopies: Book.sequelize.literal('availableCopies - 1')
            },
            {
                where: {
                    id: bookId,
                    availableCopies: { [Op.gt]: 0 }
                }
            }
        );

        if (updatedRows === 0) {
            const book = await Book.findByPk(bookId);

            return callback({
                code: book ? 9 : 5,
                message: book
                ? 'No available copies to borrow.'
                : 'Book not found.'
            });
        }
        return callback(null, {
            success: true,
            message: 'Book reserved successfully.'
        });
    }catch (error) {
        console.error('Error reserving book:', error);
        return callback({
            code: 13,
            message: 'An internal error occurred while reserving the book.'
        });
    }
    }

    async function releaseBook(call, callback){
        try {
            const bookId = Number(call.request.id);

            if(!Number.isInteger(bookId) || bookId <=0){
                return callback({
                    code: 3,
                    message: 'A valid book ID is required.'
                });
            }
            const [updatedRows] = await Book.update(
                {
                    availableCopies: Book.sequelize.literal(
                                'availableCopies + 1'
                            )
                        },
                        {
                            where: {
                                id: bookId,
                                availableCopies: {
                                    [Op.lt]: Book.sequelize.col('totalCopies')
                                }
                            }
                        }
                    
                    );
                    if(updatedRows === 0){
                        const book = await Book.findByPk(bookId);
                        return callback({
                            code: book ? 9 : 5,
                            message: book
                            ? 'All copies are already available.'
                            : 'Book not found.'
                        });
                    }
                return callback(null, {
                    success: true,
                    message: 'Book released successfully.'  

                });

            }catch (error) {
                return callback ({
                    code: 13,
                    message: 'Failed to release the book'
                });
        }
    }

module.exports = {
    addBook,
    getBook,
    listBooks,
    listAvailableBooks,
    updateBook,
    removeBook,
    reserveBook,
    releaseBook
};