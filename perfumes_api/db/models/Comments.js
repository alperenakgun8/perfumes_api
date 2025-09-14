const mongoose = require("mongoose");

const schema = mongoose.Schema({
    user_id: {type: String, required: true},
    perfume_id: {type: String, required: true},
    content: {type: String, required: true},
    parent_comment_id: String,
    rating: Number,
}, {
    verionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Comments extends mongoose.Model {

}

schema.loadClass(Comments);
module.exports = mongoose.model("comments", schema);