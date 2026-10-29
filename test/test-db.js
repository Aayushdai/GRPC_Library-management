require("dotenv").config();

const bookSequelize = require("../services/book-service/config/database");
const borrowingSequelize = require("../services/borrowing-service/config/database");

async function testConnections() {
    try {
        await bookSequelize.authenticate();
        console.log("Book Service database connection successful.");

        await borrowingSequelize.authenticate();
        console.log("Borrowing Service database connection successful.");
    } catch (error) {
        console.error("Database connection failed:", error.message);
    } finally {
        await bookSequelize.close();
        await borrowingSequelize.close();
    }
}

testConnections();