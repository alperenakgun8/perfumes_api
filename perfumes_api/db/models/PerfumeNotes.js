const mongoose = require("mongoose");

const schema = mongoose.Schema({
    perfume_id: {type: String, required: true},
    note_id: {type: String, required: true},
    noteType: {type: String, required: true}
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