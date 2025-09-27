const mongoose = require("mongoose");

const schema = mongoose.Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    concentration_id: {type: mongoose.Schema.Types.ObjectId, ref:"concentrations", required: true, unique: false},
    brand: {type: String, required: true},
    gender: {type: String, required: true, enum: ["Kadın", "Erkek", "Unisex"]},
    image_url: {type: String, required: true}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

// schema.index({name: 1, concentration_id: 1}, {unique: true});

class Perfumes extends mongoose.Model{

}

schema.loadClass(Perfumes);
module.exports = mongoose.model("perfumes", schema);
