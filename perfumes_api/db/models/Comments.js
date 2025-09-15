const mongoose = require("mongoose");

const schema = mongoose.Schema({
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: "users", required: true},
    perfume_id: {type: mongoose.Schema.Types.ObjectId, ref: "perfumes", required: true},
    content: {type: String, required: true},
    parent_comment_id: String,
    rating: Number,
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Comments extends mongoose.Model {

}

schema.loadClass(Comments);
module.exports = mongoose.model("comments", schema);