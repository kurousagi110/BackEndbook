import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Middleware functions

const middleware = {
    // Xác thực JWT token
    authenticateToken: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: "Access token required" });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: "Invalid or expired token" });
            }
            req.user = user;
            next();
        });
    },

    // Kiểm tra quyền admin
    requireAdmin: (req, res, next) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        next();
    },



    // Validation cho project
    validateProject: (req, res, next) => {
        const { name, description } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: "Project name is required" });
        }
        
        if (name.length > 100) {
            return res.status(400).json({ error: "Project name must be less than 100 characters" });
        }
        
        if (description && description.length > 500) {
            return res.status(400).json({ error: "Description must be less than 500 characters" });
        }
        
        next();
    },

    // Rate limiting
    rateLimit: (() => {
        const requests = new Map();
        
        return (req, res, next) => {
            const ip = req.ip;
            const now = Date.now();
            const windowStart = now - 60000; // 1 minute window
            
            if (!requests.has(ip)) {
                requests.set(ip, []);
            }
            
            const userRequests = requests.get(ip).filter(time => time > windowStart);
            userRequests.push(now);
            requests.set(ip, userRequests);
            
            if (userRequests.length > 10) { // 10 requests per minute
                return res.status(429).json({ error: "Too many requests" });
            }
            
            next();
        };
    })()
};

export default middleware;