const mongoose = require("mongoose");

const schema = mongoose.Schema({
    email: {type:  String, required: true, unique: true},
    password: {tpye: String, required: true},
    first_name: {tpye: String, required: true},
    last_name: {tpye: String, required: true},
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Users extends mongoose.Model{

}

schema.loadClass(Users);
module.exports = mongoose.model("users", schema);