import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

export default class ForgotPasswordDto extends BaseDto {
  static schema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
  });
}