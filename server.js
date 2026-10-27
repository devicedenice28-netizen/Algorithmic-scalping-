import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "ea_algopro_secure_jwt_secret_key_2026";

if (!JWT_SECRET) {
    throw new Error("Set the JWT_SECRET environment variable.");
}

// Demonstration storage only.
// Replace with PostgreSQL before production.
const users = [];
const positions = [];

function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    try {
        req.user = jwt.verify(
            header.slice(7),
            JWT_SECRET
        );

        next();
    } catch {
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
}

app.get("/", (req, res) => {
    res.json({
        application: "EA ALGOPRO",
        status: "online",
        mode: "demo",
        version: "1.0.0"
    });
});

// Register a user
app.post("/api/auth/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            password.length < 10 ||
            password.length > 128
        ) {
            return res.status(400).json({
                error: "Provide a valid email and password of 10–128 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (users.some(u => u.email === normalizedEmail)) {
            return res.status(409).json({
                error: "Account already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = {
            id: users.length + 1,
            email: normalizedEmail,
            passwordHash
        };

        users.push(user);

        res.status(201).json({
            message: "Account created successfully",
            userId: user.id
        });
    } catch {
        res.status(500).json({
            error: "Registration failed"
        });
    }
});

// Log in
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    const user = users.find(
        u => u.email === email.trim().toLowerCase()
    );

    if (
        !user ||
        !(await bcrypt.compare(password, user.passwordHash))
    ) {
        return res.status(401).json({
            error: "Invalid email or password"
        });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "2h" }
    );

    res.json({
        message: "Login successful",
        token,
        expiresIn: 7200,
        user: {
            id: user.id,
            email: user.email
        }
    });
});

// Dashboard
app.get("/api/dashboard", authenticate, (req, res) => {
    const myPositions = positions.filter(
        p => p.userId === req.user.id
    );

    res.json({
        application: "EA ALGOPRO",
        accountMode: "DEMO",
        balance: 10000,
        equity: 10000,
        openPositions: myPositions.length,
        positions: myPositions
    });
});

// Create a simulated position.
// This endpoint does NOT place a real broker trade.
app.post("/api/demo/positions", authenticate, (req, res) => {
    const { symbol, type, entryPrice, stopLoss, takeProfit } =
        req.body;

    if (
        typeof symbol !== "string" ||
        !/^[A-Z0-9._\/-]{2,20}$/i.test(symbol) ||
        !["BUY", "SELL"].includes(type) ||
        !Number.isFinite(entryPrice) ||
        !Number.isFinite(stopLoss) ||
        !Number.isFinite(takeProfit) ||
        entryPrice <= 0 ||
        stopLoss <= 0 ||
        takeProfit <= 0
    ) {
        return res.status(400).json({
            error: "Invalid position parameters"
        });
    }

    if (
        (type === "BUY" &&
            !(stopLoss < entryPrice &&
              takeProfit > entryPrice)) ||
        (type === "SELL" &&
            !(takeProfit < entryPrice &&
              stopLoss > entryPrice))
    ) {
        return res.status(400).json({
            error: "Stop-loss and take-profit do not match the trade direction"
        });
    }

    const position = {
        id: positions.length + 1,
        userId: req.user.id,
        symbol: symbol.toUpperCase(),
        type,
        entryPrice,
        stopLoss,
        takeProfit,
        status: "DEMO_OPEN",
        createdAt: new Date().toISOString()
    };

    positions.push(position);

    res.status(201).json({
        message: "Demo position created",
        position
    });
});

// View demo positions
app.get("/api/demo/positions", authenticate, (req, res) => {
    res.json(
        positions.filter(p => p.userId === req.user.id)
    );
});

// If executed directly via `node server.js`
if (process.argv[1]?.endsWith("server.js")) {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`EA ALGOPRO standalone server running on port ${PORT}`);
    });
}

export default app;
