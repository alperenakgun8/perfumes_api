const Enum = require("../config/enum");
const CustomError = require("./Error");
const config = require("../config");
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

class Response {
    constructor() {}

    static successResponse(data, code = Enum.HTTP_CODES.OK) {
        return {
            code,
            data
        }
    }

    static errorResponse(error, lang) {
        console.log(error);
        if(error instanceof CustomError) {
            return {
                code: error.code,
                error: {
                    message: error.message,
                    description: error.description
                }
            }
        } else if (error.code === 11000) {
            return {
                code: Enum.HTTP_CODES.CONFLICT,
                error: {
                    message: i18n.translate("COMMON.ALREADY_EXIST", lang),
                    description: i18n.translate("COMMON.ALREADY_EXIST", lang)
                }
            }
        } else {
            return {
                code: Enum.HTTP_CODES.INT_SERVER_ERROR,
                error: {
                    message: i18n.translate("COMMON.UNKNOWN_ERROR", lang),
                    description: error.message
                }
            }
        }
    }
}

module.exports = Response;