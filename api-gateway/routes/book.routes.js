const express = require("express");
const router = express.Router();

const bookController = require("../controllers/book.controller");

router.post("/", bookController.addBook);
router.get("/available", bookController.listAvailableBooks);
router.get("/", bookController.listBooks);
router.get("/:id", bookController.getBook);
router.put("/:id", bookController.updateBook);
router.delete("/:id", bookController.removeBook);

module.exports = router;