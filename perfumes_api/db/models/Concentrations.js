const mongoose = require("mongoose");

const schema = mongoose.Schema({
    name: {type: String, required: true, unique: true},
    display_name: {type: String, required: true, unique: true}
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