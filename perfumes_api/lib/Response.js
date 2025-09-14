const Enum = require("../config/enum");
const CustomError = require("./Error");

class Response {
    constructor() {}

    static successResponse(data, code = Enum.HTTP_CODES.OK) {
        return {
            code,
            data
        }
    }

    static errorResponse(error) {
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
                    message: "Already Exists!",
                    description: "Already Exists!"
                }
            }
        } else {
            return {
                code: Enum.HTTP_CODES.INT_SERVER_ERROR,
                error: {
                    message: "Unknown Error",
                    description: error.message
                }
            }
        }
    }
}

module.exports = Response;