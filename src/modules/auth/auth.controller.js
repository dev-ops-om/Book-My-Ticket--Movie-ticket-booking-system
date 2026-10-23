import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";

export const register = async (req, res, next) => {
  try {
    const data = await authService.registerUser(req.body);
    return ApiResponse.created(res, "User registered successfully", data);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = await authService.loginUser(req.body);
    return ApiResponse.ok(res, "Login successful", data);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  // req.user attached by authenticate middleware
  return ApiResponse.ok(res, "Current user profile", req.user);
};
