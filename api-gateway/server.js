require("dotenv").config();

const express = require("express");
const memberRoutes = require("./routes/member.routes");
const bookRoutes = require("./routes/book.routes");
const borrowingRoutes = require("./routes/borrowing.routes");

const app = express();
const port = Number(process.env.API_GATEWAY_PORT || 3000);

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "API Gateway is running."
    });
});

app.use("/api/books", bookRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/borrowings", borrowingRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found"
    });
});

app.listen(port, "127.0.0.1", () => {
    console.log(`API Gateway running on port ${port}`);
});
