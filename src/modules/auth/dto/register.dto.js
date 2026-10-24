import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

export default class RegisterDto extends BaseDto {
  static schema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(6).required(),
  });
};
