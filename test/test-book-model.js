const { sequelize, Book } = require("../services/book-service/models");

async function testBookModel() {
  try {
    await sequelize.authenticate();
    console.log("Database connection successful.");

    console.log("Model loaded:", Book.name);
    console.log("Book attributes:", Object.keys(Book.getAttributes()));

    console.log("Book model test passed.");
  } catch (error) {
    console.error("Book model test failed:", error.message);
  } finally {
    await sequelize.close();
  }
}

testBookModel();