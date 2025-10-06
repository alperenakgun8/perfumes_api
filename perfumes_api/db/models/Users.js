const mongoose = require("mongoose");
const is = require("is_js");
const Enum = require("../../config/enum");
const bcrypt = require("bcrypt-nodejs");
const CustomError = require('../../lib/Error');

const schema = mongoose.Schema({
    email: {type:  String, required: true, unique: true},
    password: {type: String, required: true, select: false},
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    nickname: {type: String, required: true},
    profile_picture: { type: String , default: ""}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Users extends mongoose.Model{

    validPassword(password) {
        return bcrypt.compareSync(password, this.password);
    }

    static validateFieldsBeforeAuth(email, password) {
        if(typeof password !== "string" || password.length < Enum.MIN_PASSWORD_LENGTH || password.length > Enum.MAX_PASSWORD_LENGTH || is.not.email(email)) {
            throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, Enum.VALIDATION_ERROR, "email or password wrong");
        }
        return null;
    }
}

schema.loadClass(Users);
module.exports = mongoose.model("users", schema);