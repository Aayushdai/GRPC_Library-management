const express = require("express");
const memberController = require("../controllers/member.controller");

const router = express.Router();

router.post("/", memberController.registerMember);
router.get("/", memberController.listMembers);
router.get("/:id", memberController.getMember);
module.exports = router;