const express = require("express");
const borrowingController = require("../controllers/borrowing.controller");

const router = express.Router();

router.post("/", borrowingController.borrowBook);
router.get("/", borrowingController.listBorrowings);
router.get("/:id", borrowingController.getBorrowing);
router.post("/:id/return", borrowingController.returnBook);

module.exports = router;