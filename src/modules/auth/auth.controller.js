import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";

export const register = async (req, res, next) => {
  try {
    const data = await authService.registerUser(req.body);
    return ApiResponse.created(res, "Registration successful", data);
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

export const forgotPassword = async (req, res, next) => {
  try {
    const data = await authService.forgotPassword(req.body.email);
    return ApiResponse.ok(res, data.message, data);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const data = await authService.resetPassword(req.body);
    return ApiResponse.ok(res, data.message, null);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return ApiResponse.ok(res, "Current user profile", user);
  } catch (error) {
    next(error);
  }
};
