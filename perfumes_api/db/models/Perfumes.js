const mongoose = require("mongoose");

const schema = mongoose.Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    imageUrl: String,
    concentration_id: {type: String, unique: true}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Perfumes extends mongoose.Model{

}

schema.loadClass(Perfumes);
module.exports = mongoose.model("perfumes", schema);