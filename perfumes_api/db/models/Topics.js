const mongoose = require("mongoose");

const schema = mongoose.Schema({
    title: {type: String, required: true},
    content: {type: String, required: true},
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: "users", required: true},
    is_active: {type: Boolean, default: true}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Topics extends mongoose.Model {

}

schema.loadClass(Topics);
module.exports = mongoose.model("topics", schema);