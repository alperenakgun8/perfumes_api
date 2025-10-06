const mongoose = require("mongoose");

const schema = mongoose.Schema({
    perfume_id: {type: mongoose.Schema.Types.ObjectId, ref: "perfumes",required: true},
    note_id: {type: mongoose.Schema.Types.ObjectId, ref:"notes", required: true},
    note_type: {type: String, required: true, enum: ["TOP", "MIDDLE", "BASE"]}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

schema.index({perfume_id: 1, note_id: 1}, {unique: true});

class PerfumeNotes extends mongoose.Model {

}

schema.loadClass(PerfumeNotes);
module.exports = mongoose.model("perfume_notes", schema);