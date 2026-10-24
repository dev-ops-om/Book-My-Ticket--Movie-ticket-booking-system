import ApiError from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/jwt.utils.js";
import User from "../../modules/auth/auth.model.js";

export const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      throw ApiError.unauthorized("Authentication token required");
    }

    const decoded = verifyAccessToken(token);

    // Verify user exists in MongoDB Atlas
    const user = await User.findById(decoded.id);

    if (!user) {
      throw ApiError.unauthorized("User account no longer exists");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      next(ApiError.unauthorized("Invalid or expired authentication token"));
    } else {
      next(error);
    }
  }
};