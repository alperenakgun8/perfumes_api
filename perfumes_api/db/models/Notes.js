const mongoose = require("mongoose");

const schema = mongoose.Schema({
    name: {type: String, required: true, unique: true},
    image_url: {type: String, required: true},
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Notes extends mongoose.Model{

}

schema.loadClass(Notes);
module.exports = mongoose.model("notes", schema);