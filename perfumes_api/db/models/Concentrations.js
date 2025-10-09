const mongoose = require("mongoose");

const schema = mongoose.Schema({
    name: {type: String, required: true, unique: true},
    display_name: {type: String, required: true, unique: true},
    created_by: {type: mongoose.Schema.Types.ObjectId, ref: "users"}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Concentrations extends mongoose.Model {

}

schema.loadClass(Concentrations);
module.exports = mongoose.model("concentrations", schema);