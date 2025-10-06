const mongoose = require("mongoose");

const schema = mongoose.Schema({
    role_name: {type: String, required: true, unique: true},
    created_by: {type: mongoose.Schema.Types.ObjectId, ref: "users"}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Roles extends mongoose.Model {
    
}

schema.loadClass(Roles);
module.exports = mongoose.model("roles", schema);