import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

export default class ResetPasswordDto extends BaseDto {
  static schema = Joi.object({
    password: Joi.string().min(6).required(),
  });
}